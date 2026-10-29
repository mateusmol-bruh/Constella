const test = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes, randomInt } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');

// Opt-in após migração autorizada. Somente dados novos TESTE, todos revertidos por rollback.
test('PostgreSQL de desenvolvimento: respostas, idempotência, FK e saída transacional', {
  skip: process.env.CONSTELLA_REPLIES_INTEGRATION !== '1', timeout: 30000,
}, async () => {
  require('dotenv').config({ quiet: true });
  assert.equal(process.env.NODE_ENV, 'development');
  const prisma = require('../src/config/prisma');
  const suffix = randomBytes(10).toString('hex');
  const rollback = new Error('ROLLBACK_TESTE_RESPOSTAS');
  function service(name, db, extra = {}) {
    const filename = path.join(__dirname, '../src/services', `${name}.service.js`);
    const mod = new Module(filename, module);
    const dependencies = { '../config/prisma': db, './resposta.service': require('../src/services/resposta.service'),
      './notificacao.service': { enabled: () => false, enfileirar: async () => {} }, ...extra };
    mod.require = key => { assert.ok(Object.hasOwn(dependencies, key), key); return dependencies[key]; };
    mod._compile(fs.readFileSync(filename, 'utf8'), filename);
    return mod.exports;
  }
  try {
    const [columns] = await prisma.$queryRaw`SELECT COUNT(*)::int AS total FROM information_schema.columns
      WHERE table_schema = current_schema() AND ((table_name = 'mensagem' AND column_name IN ('resposta_id','envio_id'))
      OR (table_name = 'postagem' AND column_name IN ('resposta_id','envio_id','tipo_post')))`;
    assert.equal(columns.total, 5, 'Aplique antes a migração autorizada; este teste não aplica migrações.');
    await assert.rejects(prisma.$transaction(async tx => {
      const db = new Proxy(tx, { get(target, key) { return key === '$transaction' ? action => action(tx) : Reflect.get(target, key); } });
      const users = [];
      for (const label of ['a', 'b', 'c']) users.push(await tx.usuaria.create({ data: {
        nome_usr: `TESTE respostas ${label}`, email_usr: `teste-respostas-${suffix}-${label}@example.invalid`,
        cpf_usr: String(randomInt(10000000000, 99999999999)), senha_usr: 'TESTE_INATIVA_SEM_LOGIN',
      } }));
      const [a, b, c] = users;
      await tx.conexao.create({ data: { id_user_solicit: a.id_usr, id_user_receb: b.id_usr, status_conexao: 'ACEITO' } });
      const conversation = await tx.chat.create({ data: { id_usr_01: a.id_usr, id_usr_02: b.id_usr } });
      const chat = service('chat', db, { './bloqueio.service': service('bloqueio', db) });
      const photo = await tx.mensagem.create({ data: { id_chat: conversation.id_chat, id_usr_emissor: b.id_usr, cont_msg: '', imagem_msg: '/api/anexos/TESTE-sem-arquivo.png' } });
      const options = { resposta_id: String(photo.id_msg), envio_id: `teste-${suffix}` };
      const first = await chat.enviarMensagem(String(a.id_usr), String(conversation.id_chat), 'Resposta à foto', null, options);
      const retry = await chat.enviarMensagem(String(a.id_usr), String(conversation.id_chat), 'Resposta à foto', null, options);
      assert.equal(first.id_msg, retry.id_msg); assert.equal(first.resposta.imagem, true);
      const history = await chat.listarMensagens(String(b.id_usr), String(conversation.id_chat));
      assert.equal(history.find(row => row.id_msg === first.id_msg).resposta.id, String(photo.id_msg));
      await assert.rejects(chat.listarMensagens(String(c.id_usr), String(conversation.id_chat)), error => error.statusCode === 403);
      await tx.mensagem.delete({ where: { id_msg: photo.id_msg } }); // Apenas registro TESTE desta transação.
      assert.equal((await tx.mensagem.findUnique({ where: { id_msg: BigInt(first.id_msg) } })).resposta_id, null);

      const moderator = await tx.moderadora.create({ data: { nome_mod: 'TESTE', email_mod: `teste-${suffix}@example.invalid`, senha_mod: 'TESTE_INATIVA_SEM_LOGIN' } });
      const forum = await tx.forum.create({ data: { titulo_for: 'TESTE respostas', id_usr_criadora: a.id_usr, id_mod: moderator.id_mod } });
      await tx.usuaria_forum.createMany({ data: users.slice(0, 2).map(user => ({ id_for: forum.id_for, id_usr: user.id_usr })) });
      const posts = service('postagem', db), forums = service('forum', db);
      const original = await posts.criarPostagem(String(a.id_usr), String(forum.id_for), { conteudo: 'Original' });
      const reply = await posts.criarPostagem(String(b.id_usr), String(forum.id_for), { conteudo: 'Resposta', resposta_id: original.id_post, envio_id: `teste-${suffix}` });
      assert.equal(reply.resposta.id, original.id_post);
      await forums.sairForum(String(b.id_usr), String(forum.id_for));
      await forums.sairForum(String(b.id_usr), String(forum.id_for));
      const feed = await posts.listarPostagens(String(a.id_usr), String(forum.id_for));
      assert.equal(feed.filter(row => row.tipo === 'sistema').length, 1);
      assert.equal(feed.find(row => row.tipo === 'sistema').autora, undefined);
      const [listed] = await forums.listarForuns(String(a.id_usr), 'meus');
      assert.equal(listed.nao_lidas, 1, 'Aviso de saída não aumenta contador de mensagens.');
      await assert.rejects(posts.listarPostagens(String(b.id_usr), String(forum.id_for)), error => error.statusCode === 403);
      throw rollback;
    }, { timeout: 20000 }), error => error === rollback);
    assert.equal(await prisma.usuaria.count({ where: { email_usr: { startsWith: `teste-respostas-${suffix}` } } }), 0);
  } finally { await prisma.$disconnect(); }
});
