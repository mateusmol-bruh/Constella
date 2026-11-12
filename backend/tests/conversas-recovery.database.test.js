const test = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes, randomInt } = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

test('HTTP + PostgreSQL: chats/fóruns vazios, histórico, texto, imagem privada e resposta', {
  skip: process.env.CONSTELLA_CONVERSATION_INTEGRATION !== '1', timeout: 60000,
}, async () => {
  require('dotenv').config({ quiet: true });
  assert.equal(process.env.NODE_ENV, 'development');
  const prismaPath = require.resolve('../src/config/prisma');
  const prisma = require(prismaPath);
  const originalExport = require.cache[prismaPath].exports;
  const originalUploads = process.env.UPLOADS_DIR, originalPush = process.env.CONSTELLA_PUSH_ENABLED;
  const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'constella-conversation-test-'));
  process.env.UPLOADS_DIR = uploads;
  process.env.CONSTELLA_PUSH_ENABLED = 'false';
  const suffix = randomBytes(10).toString('hex');
  const rollback = new Error('ROLLBACK_TESTE_CONVERSAS');
  const snapshot = () => prisma.$queryRaw`SELECT 'mensagem' AS tabela,count(*)::int AS total,
    md5(coalesce(string_agg(to_jsonb(t)::text,'' ORDER BY id_msg),'')) AS hash FROM mensagem t
    UNION ALL SELECT 'postagem',count(*)::int,md5(coalesce(string_agg(to_jsonb(t)::text,'' ORDER BY id_post),'')) FROM postagem t`;
  const before = await snapshot();
  try {
    await assert.rejects(prisma.$transaction(async tx => {
      const db = new Proxy(tx, { get(target, key) { return key === '$transaction' ? action => action(db) : Reflect.get(target, key); } });
      require.cache[prismaPath].exports = db;
      const users = [];
      for (const label of ['a', 'b', 'c']) users.push(await tx.usuaria.create({ data: {
        nome_usr: `TESTE conversas ${label}`, email_usr: `teste-conversas-${suffix}-${label}@example.invalid`,
        cpf_usr: String(randomInt(10000000000, 99999999999)), senha_usr: 'TESTE_INATIVA_SEM_LOGIN',
      } }));
      const [a, b, c] = users;
      await tx.conexao.create({ data: { id_user_solicit: a.id_usr, id_user_receb: b.id_usr, status_conexao: 'ACEITO' } });
      const conversation = await tx.chat.create({ data: { id_usr_01: a.id_usr, id_usr_02: b.id_usr } });
      const moderator = await tx.moderadora.create({ data: { nome_mod: 'TESTE', email_mod: `teste-conversas-${suffix}@example.invalid`, senha_mod: 'TESTE_INATIVA_SEM_LOGIN' } });
      const forum = await tx.forum.create({ data: { titulo_for: 'TESTE recuperação', id_usr_criadora: a.id_usr, id_mod: moderator.id_mod } });
      await tx.usuaria_forum.createMany({ data: [a, b].map(user => ({ id_for: forum.id_for, id_usr: user.id_usr })) });
      const app = require('../server');
      const server = app.listen(0, '127.0.0.1');
      await new Promise((resolve, reject) => { server.once('listening', resolve); server.once('error', reject); });
      const origin = `http://127.0.0.1:${server.address().port}`;
      const tokens=new Map();
      for(const user of users)tokens.set(String(user.id_usr),await require('../src/services/sessao.service').emitirSessao('usuaria',user.id_usr,db));
      const token=user=>tokens.get(String(user.id_usr));
      async function request(endpoint, user = a, method = 'GET', body) {
        return fetch(origin + endpoint, { method, headers: { 'Content-Type': 'application/json', ...(user ? { Authorization: `Bearer ${token(user)}` } : {}) },
          ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(10000) });
      }
      async function json(endpoint, user = a, method = 'GET', body, expected = 200) {
        const response = await request(endpoint, user, method, body);
        assert.equal(response.status, expected, `${method} ${endpoint}`);
        return response.json();
      }
      const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a4F8AAAAASUVORK5CYII=';
      try {
        for (const isForum of [false, true]) {
          const endpoint = isForum ? `/api/foruns/${forum.id_for}/postagens` : `/api/chats/${conversation.id_chat}/mensagens`;
          const entries = body => isForum ? body.postagens : body.mensagens;
          const record = body => isForum ? body.postagem : body.dados;
          const id = row => isForum ? row.id_post : row.id_msg;
          assert.deepEqual(entries(await json(endpoint)), []);
          await json(endpoint, null, 'GET', undefined, 401);
          await json(endpoint, c, 'GET', undefined, 403);
          const first = record(await json(endpoint, a, 'POST', { conteudo: 'TESTE texto' }, 201));
          assert.equal(first.imagem, null); assert.equal(first.resposta, null);
          const reply = record(await json(endpoint, b, 'POST', { conteudo: 'TESTE resposta', resposta_id: id(first), envio_id: `resposta-${suffix}` }, 201));
          assert.equal(reply.resposta.id, id(first));
          const uploaded = await json('/api/uploads/imagens', b, 'POST', { imagem: png, privada: true }, 201);
          const imageBody = { conteudo: '', imagem: uploaded.caminho, envio_id: `imagem-${suffix}` };
          const image = record(await json(endpoint, b, 'POST', imageBody, 201));
          assert.equal(id(record(await json(endpoint, b, 'POST', imageBody, 201))), id(image));
          const binary = await request(uploaded.caminho, a);
          assert.equal(binary.status, 200); assert.equal(binary.headers.get('content-type'), 'image/png');
          assert.equal(Buffer.from(await binary.arrayBuffer()).toString('base64'), png);
          assert.equal((await request(uploaded.caminho, c)).status, 404);
          const imageReply = record(await json(endpoint, a, 'POST', { conteudo: 'TESTE resposta à foto', resposta_id: id(image) }, 201));
          assert.equal(imageReply.resposta.imagem, true);
          // Registros antigos sem imagem/resposta, apenas dentro da transação TESTE.
          if (isForum) await tx.postagem.createMany({ data: Array.from({ length: 55 }, (_, index) => ({ id_for: forum.id_for, id_usr: a.id_usr, cont_post: `TESTE histórico ${index}`, dt_post: new Date('2020-01-01T00:00:00Z') })) });
          else await tx.mensagem.createMany({ data: Array.from({ length: 55 }, (_, index) => ({ id_chat: conversation.id_chat, id_usr_emissor: a.id_usr, cont_msg: `TESTE histórico ${index}`, dt_envio: new Date('2020-01-01T00:00:00Z') })) });
          const recent = entries(await json(endpoint, b)), old = entries(await json(`${endpoint}?pagina=2&limite=50`, b));
          assert.equal(recent.length, 50); assert.equal(old.length, 9);
          assert.ok(old.every(row => row.imagem === null && row.resposta === null));
          assert.ok(recent.some(row => id(row) === id(image) && row.imagem === uploaded.caminho));
          assert.deepEqual(entries(await json(endpoint, b)).map(id), recent.map(id), 'Reabrir/atualizar preserva mensagens e ordem');
          const reloadImage = await request(uploaded.caminho, a); assert.equal(reloadImage.status, 200); await reloadImage.arrayBuffer();
          await json(isForum ? '/api/foruns/9223372036854775807/postagens' : '/api/chats/9223372036854775807/mensagens', a, 'GET', undefined, 404);
        }
      } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
      throw rollback;
    }, { timeout: 45000 }), error => error === rollback);
    assert.deepEqual(await snapshot(), before, 'Todas as mensagens/postagens existentes devem permanecer idênticas.');
    assert.equal(await prisma.usuaria.count({ where: { email_usr: { startsWith: `teste-conversas-${suffix}` } } }), 0);
  } finally {
    require.cache[prismaPath].exports = originalExport;
    if (originalUploads === undefined) delete process.env.UPLOADS_DIR; else process.env.UPLOADS_DIR = originalUploads;
    if (originalPush === undefined) delete process.env.CONSTELLA_PUSH_ENABLED; else process.env.CONSTELLA_PUSH_ENABLED = originalPush;
    await prisma.$disconnect();
  }
});
