const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const { fork } = require('node:child_process');
const { randomBytes, randomInt } = require('node:crypto');
const ts = require('typescript');

// Opt-in: somente PostgreSQL local, contas sintéticas; nenhum reset/migração/seed.
test('serviços reais do mobile → Express → Prisma → PostgreSQL', {
  skip: process.env.CONSTELLA_LOCAL_INTEGRATION !== '1', timeout: 90000,
}, async t => {
  const backend = path.resolve(__dirname, '../../backend');
  const backendRequire = createRequire(path.join(backend, 'package.json'));
  const env = backendRequire('dotenv').parse(fs.readFileSync(path.join(backend, '.env')));
  const database = new URL(env.DATABASE_URL);
  assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(database.hostname), 'Teste restrito ao banco local.');
  assert.notEqual(env.NODE_ENV, 'production', 'Banco de produção não permitido.');
  const pg = new (backendRequire('pg').Client)({ connectionString: env.DATABASE_URL, connectionTimeoutMillis:5000 });
  const cache = new Map();
  function load(filename) {
    filename = path.resolve(filename);
    if (cache.has(filename)) return cache.get(filename).exports;
    const module = { exports: {} }; cache.set(filename, module);
    const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop:true },
    }).outputText;
    vm.runInNewContext(code, { module, exports:module.exports, process, Error,
      require(name) { return name.startsWith('.') ? load(path.resolve(path.dirname(filename), `${name}.ts`)) : require(name); },
    }, { filename });
    return module.exports;
  }
  let child;
  async function start() {
    child = fork(path.join(__dirname, 'integration-server.cjs'), [], {
      cwd:backend, env:{ ...process.env, ...env }, silent:true,
    });
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Servidor não iniciou em 15 segundos.')), 15000);
      child.once('message', ({ port }) => { clearTimeout(timer); resolve(`http://127.0.0.1:${port}`); });
      child.once('exit', () => { clearTimeout(timer); reject(new Error('Servidor encerrou antes de iniciar.')); });
      child.once('error', () => { clearTimeout(timer); reject(new Error('Falha ao iniciar servidor.')); });
    });
  }
  async function stop() {
    if (!child || child.exitCode !== null) return;
    const exited = new Promise(resolve => child.once('exit', resolve));
    child.send('stop');
    const timer = setTimeout(() => child.kill(), 5000);
    await exited; clearTimeout(timer);
  }
  const email = `teste-mobile-${randomBytes(10).toString('hex')}@example.invalid`;
  const senha = randomBytes(24).toString('base64url');
  function cpf() {
    const n = Array.from({length:9}, () => randomInt(10));
    for (const size of [9,10]) { const r = n.reduce((s,d,i) => s+d*(size+1-i),0)*10%11; n.push(r===10?0:r); }
    return n.join('');
  }
  try {
    await pg.connect();
    process.env.EXPO_PUBLIC_API_URL = await start();
    const { api, setApiSession } = load(path.resolve(__dirname, '../src/services/api.ts'));
    // Não propaga AxiosError com config (senha/JWT) para o relatório do node:test.
    api.interceptors.response.use(r=>r, e=>Promise.reject(Object.assign(new Error(`API recusou a operação (HTTP ${e.response?.status ?? 'indisponível'}).`), { status:e.response?.status })));
    const { authService:auth } = load(path.resolve(__dirname, '../src/services/auth.service.ts'));
    const { communityService:repo } = load(path.resolve(__dirname, '../src/services/community.service.ts'));
    const { socialService:social } = load(path.resolve(__dirname, '../src/services/social.service.ts'));
    const input = {nome:'TESTE mobile integração',email,senha,cpf:cpf()};
    let account;
    let imagePath;
    const imageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a4F8AAAAASUVORK5CYII=';
    await t.test('cadastro pelo serviço mobile persiste; duplicado é recusado', async () => {
      account = await auth.register(input); setApiSession(account.token);
      const row = await pg.query('SELECT id_usr::text FROM public.usuaria WHERE email_usr=$1',[email]);
      assert.equal(row.rowCount,1); assert.equal(row.rows[0].id_usr,account.usuaria.id);
      await assert.rejects(auth.register(input), e=>e.status===409);
      assert.equal((await repo.profile()).id,account.usuaria.id);
      const uploaded = await api.post('/api/uploads/imagens',{imagem:imageBase64});
      assert.equal(uploaded.status,201);
      imagePath = uploaded.data.caminho;
      await repo.editProfile({nome:input.nome,email,foto:imagePath});
      const storedPhoto = await pg.query('SELECT foto_usr FROM public.usuaria WHERE id_usr=$1',[account.usuaria.id]);
      assert.equal(storedPhoto.rows[0].foto_usr,imagePath);
    });
    assert.ok(account, 'Cadastro precisa passar antes dos outros fluxos.');
    await t.test('reinício real do servidor preserva conta e permite novo login', async () => {
      await stop(); api.defaults.baseURL = await start();
      setApiSession(null);
      await assert.rejects(auth.login(email,`${senha}-invalida`), e=>e.status===401);
      const result = await auth.login(email,senha); setApiSession(result.token);
      assert.equal(result.usuaria.id,account.usuaria.id);
      assert.equal((await repo.profile()).id,account.usuaria.id);
      assert.equal((await repo.profile()).foto,imagePath);
      const photo = await fetch(`${api.defaults.baseURL}${imagePath}`);
      assert.equal(photo.status,200);
      assert.equal(photo.headers.get('content-type'),'image/png');
      assert.equal(Buffer.from(await photo.arrayBuffer()).toString('base64'),imageBase64);
    });
    await t.test('perfil, interesses, recomendações, conteúdos e Pro usam contratos reais', async () => {
      for (const read of [repo.interests,repo.myInterests,repo.recommendedPeople,repo.recommendedForums,repo.people,repo.connections,repo.sent,repo.received,repo.conversations,repo.forums,repo.contents]) {
        assert.ok(Array.isArray(await read()));
      }
      await repo.saveInterests([]); assert.equal((await repo.myInterests()).length,0);
      const { proService } = load(path.resolve(__dirname,'../src/services/pro.service.ts'));
      assert.ok(await proService.status()); assert.ok(Array.isArray(await proService.catalog()));
      if(process.env.CONSTELLA_PRO_DEMO==='true' && process.env.NODE_ENV==='development') {
        const active=await proService.demo(true); assert.equal(active.demonstracao,true);
        const catalog=await proService.catalog();
        if(catalog.length) assert.equal((await proService.content(catalog[0].id)).id,catalog[0].id);
        assert.equal((await proService.demo(false)).ativo,false);
      }
    });
    await t.test('fórum e postagem persistem sem misturar chat privado', async () => {
      const forum = await repo.createForum({titulo:'TESTE mobile fórum',descricao:'Integração real',capa:imagePath});
      assert.equal((await repo.forum(forum.id_for)).participando,true);
      assert.equal((await repo.forum(forum.id_for)).capa,imagePath);
      const post = await social.sendPost(forum.id_for,'TESTE mensagem persistida');
      assert.ok((await social.posts(forum.id_for)).some(x=>x.id_post===post.id_post));
      const count = await pg.query('SELECT COUNT(*)::int AS total FROM public.postagem WHERE id_post=$1',[post.id_post]);
      assert.equal(count.rows[0].total,1);
    });
    await t.test('conexão aceita e chat privado persistem; terceira conta não acessa mensagens', async () => {
      const second = await auth.register({nome:'TESTE mobile destinatária',email:`teste-mobile-${randomBytes(10).toString('hex')}@example.invalid`,senha,cpf:cpf()});
      const interests=await repo.interests(); assert.ok(interests.length>0);
      await repo.saveInterests([interests[0].id]);
      setApiSession(second.token); await repo.saveInterests([interests[0].id]);
      setApiSession(account.token);
      assert.ok((await repo.recommendedPeople()).find(person=>person.id===second.usuaria.id)?.interesses.some(item=>item.id===interests[0].id));
      await repo.saveInterests([]);
      const afterInterests=(await repo.recommendedPeople()).find(person=>person.id===second.usuaria.id);
      assert.ok(!afterInterests || afterInterests.interesses.length===0);
      await repo.connect(second.usuaria.id);
      assert.ok((await repo.sent()).some(x=>x.id_user_receb===second.usuaria.id));
      setApiSession(second.token);
      const received = (await repo.received()).find(x=>x.id_user_solicit===account.usuaria.id);
      assert.ok(received); await repo.respond(received.id_conexao,true);
      setApiSession(account.token);
      const person = await repo.person(second.usuaria.id);
      assert.equal(person.id,second.usuaria.id);
      assert.equal(person.conexao.status,'ACEITO');
      const emptyForum=await repo.createForum({titulo:'TESTE excluir fórum vazio',descricao:'',capa:null});
      setApiSession(second.token);
      await assert.rejects(api.delete(`/api/foruns/${emptyForum.id_for}`),e=>e.status===403);
      await social.joinForum(emptyForum.id_for);
      assert.equal((await repo.forum(emptyForum.id_for)).participando,true);
      await social.leaveForum(emptyForum.id_for);
      assert.equal((await repo.forum(emptyForum.id_for)).participando,false);
      setApiSession(account.token);
      await social.editForum(emptyForum.id_for,{titulo:'TESTE fórum atualizado',descricao:'Atualização real',capa:imagePath});
      assert.equal((await repo.forum(emptyForum.id_for)).capa,imagePath);
      await social.deleteForum(emptyForum.id_for);
      await assert.rejects(repo.forum(emptyForum.id_for),e=>e.status===404);
      const { chatEntries } = load(path.resolve(__dirname,'../src/utils/conversations.ts'));
      const beforeChat = chatEntries(await repo.conversations(),await repo.connections());
      assert.ok(beforeChat.some(entry=>entry.personId===second.usuaria.id && !entry.chatId));
      const chat = await repo.startChat(second.usuaria.id);
      const afterChat = chatEntries(await repo.conversations(),await repo.connections());
      assert.equal(afterChat.filter(entry=>entry.personId===second.usuaria.id).length,1);
      const message = await social.sendMessage(chat.id_chat,'TESTE chat privado persistido');
      const privateImage = (await api.post('/api/uploads/imagens',{imagem:imageBase64,privada:true})).data.caminho;
      const imageMessage = await social.sendMessage(chat.id_chat,'',privateImage);
      assert.equal(imageMessage.imagem,privateImage);
      await assert.rejects(social.sendMessage(chat.id_chat,'reutilizado',privateImage),e=>e.status===409);
      setApiSession(second.token);
      assert.ok((await social.messages(chat.id_chat)).some(x=>x.id_msg===message.id_msg));
      const summary=(await repo.conversations()).find(x=>x.id_chat===chat.id_chat);
      assert.equal(summary.nao_lidas,2); assert.equal(summary.ultima_mensagem.imagem,privateImage);
      await social.read('chat',chat.id_chat,imageMessage.id_msg);
      assert.equal((await repo.conversations()).find(x=>x.id_chat===chat.id_chat).nao_lidas,0);
      await social.read('chat',chat.id_chat,message.id_msg);
      assert.equal((await repo.conversations()).find(x=>x.id_chat===chat.id_chat).nao_lidas,0);
      assert.equal((await api.get(privateImage)).status,200);
      await assert.rejects(social.sendMessage(chat.id_chat,'anexo de outra conta',privateImage),e=>e.status===403);
      await assert.rejects(social.sendMessage(chat.id_chat,'URL externa','https://example.invalid/imagem.png'),e=>e.status===400);
      assert.equal((await fetch(`${api.defaults.baseURL}${privateImage}`)).status,401);
      const group=await repo.createForum({titulo:'TESTE leitura e imagens',descricao:'',capa:null});
      setApiSession(account.token);
      assert.ok((await social.forums('explorar')).some(x=>x.id_for===group.id_for));
      await social.joinForum(group.id_for);
      assert.ok(!(await social.forums('explorar')).some(x=>x.id_for===group.id_for));
      const forumImage=(await api.post('/api/uploads/imagens',{imagem:imageBase64,privada:true})).data.caminho;
      const imagePost=await social.sendPost(group.id_for,'',forumImage);
      setApiSession(second.token);
      assert.equal((await social.forums('meus')).find(x=>x.id_for===group.id_for).nao_lidas,1);
      assert.equal((await social.posts(group.id_for)).find(x=>x.id_post===imagePost.id_post).imagem,forumImage);
      await social.read('forum',group.id_for,imagePost.id_post);
      assert.equal((await social.forums('meus')).find(x=>x.id_for===group.id_for).nao_lidas,0);
      assert.equal((await api.get(forumImage)).status,200);
      await assert.rejects(social.block(second.usuaria.id,true),e=>e.status===400);
      assert.equal((await social.block(account.usuaria.id,true)).bloqueada,true);
      await stop(); api.defaults.baseURL = await start();
      assert.equal((await repo.person(account.usuaria.id)).bloqueada,true);
      assert.equal((await repo.conversations()).find(x=>x.id_chat===chat.id_chat).nao_lidas,0);
      assert.equal((await social.forums('meus')).find(x=>x.id_for===group.id_for).nao_lidas,0);
      assert.equal((await api.get(privateImage)).status,200);
      assert.ok((await social.blocked()).some(x=>x.id===account.usuaria.id));
      assert.ok(!(await repo.people('TESTE')).some(x=>x.id===account.usuaria.id));
      assert.ok((await social.messages(chat.id_chat)).length>0);
      await assert.rejects(social.sendMessage(chat.id_chat,'bloqueada'),e=>e.status===403);
      setApiSession(account.token);
      await assert.rejects(repo.startChat(second.usuaria.id),e=>e.status===403);
      await assert.rejects(repo.connect(second.usuaria.id),e=>e.status===403);
      await assert.rejects(social.sendMessage(chat.id_chat,'bloqueada'),e=>e.status===403);
      assert.ok(!(await repo.recommendedPeople()).some(x=>x.id===second.usuaria.id));
      await social.leaveForum(group.id_for);
      assert.ok((await social.forums('explorar')).some(x=>x.id_for===group.id_for));
      await assert.rejects(api.get(forumImage),e=>e.status===404);
      setApiSession(second.token);
      assert.equal((await social.block(account.usuaria.id,false)).interacao_bloqueada,false);
      await social.sendMessage(chat.id_chat,'desbloqueada');
      const count = await pg.query('SELECT COUNT(*)::int AS total FROM public.mensagem WHERE id_msg=$1',[message.id_msg]);
      assert.equal(count.rows[0].total,1);
      const outsider = await auth.register({nome:'TESTE mobile isolamento',email:`teste-mobile-${randomBytes(10).toString('hex')}@example.invalid`,senha,cpf:cpf()});
      setApiSession(outsider.token);
      await assert.rejects(social.messages(chat.id_chat),e=>e.status===403);
      await assert.rejects(social.read('chat',chat.id_chat,imageMessage.id_msg),e=>e.status===403);
      await assert.rejects(social.read('forum',group.id_for,imagePost.id_post),e=>e.status===403);
      await assert.rejects(api.get(privateImage),e=>e.status===404);
      await assert.rejects(api.get(forumImage),e=>e.status===404);
      await assert.rejects(social.sendPost(group.id_for,'',forumImage),e=>e.status===403);
      setApiSession(account.token);
    });
    await t.test('onboarding com zero interesses persiste e novo login não repete o fluxo', async () => {
      const state = await repo.profile();
      assert.equal(state.onboarding_concluido,false);
      assert.equal((await auth.completeOnboarding({apresentacao:'',interesses:[]})).onboarding_concluido,true);
      const stored = await pg.query('SELECT onboarding_concluido, apresentacao FROM public.usuaria WHERE id_usr=$1',[account.usuaria.id]);
      assert.equal(stored.rows[0].onboarding_concluido,true);
      assert.equal(stored.rows[0].apresentacao,'');
      setApiSession(null);
      const login = await auth.login(email,senha);
      assert.equal(login.usuaria.onboarding_concluido,true);
      setApiSession(login.token);
      assert.equal((await repo.profile()).interesses.length,0);
    });
    await t.test('visitante consulta rotas públicas reais e continua sem acesso privado', async () => {
      setApiSession(null);
      const { apiPublic, publicService } = load(path.resolve(__dirname,'../src/services/public.service.ts'));
      // A origem mudou no reinício real do processo do servidor, acima.
      apiPublic.defaults.baseURL = api.defaults.baseURL;
      apiPublic.interceptors.response.use(r=>r,e=>Promise.reject(new Error(`Consulta pública falhou (HTTP ${e.response?.status ?? 'indisponível'}).`)));
      const contents = await publicService.contents();
      assert.ok(Array.isArray(contents));
      assert.ok(Array.isArray(await publicService.forums()));
      assert.equal((await publicService.pro()).autenticada,false);
      if(contents.length) assert.equal((await publicService.content(contents[0].id)).id,contents[0].id);
      await assert.rejects(repo.profile(), e=>e.status===401);
    });
  } finally { await stop(); await pg.end(); }
});
