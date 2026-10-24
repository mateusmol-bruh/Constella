const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const replies = require('../src/services/resposta.service');
const attempt = 'teste-envio-unico-0001';
const author = { id_usr: 1n, nome_usr: 'Autora', foto_usr: null };

function load(name, db, notifications = { enabled: () => false, enfileirar: async () => {} }) {
  const filename = path.join(__dirname, '../src/services', `${name}.service.js`);
  const mod = new Module(filename, module);
  const deps = { '../config/prisma': db, './resposta.service': replies, './notificacao.service': notifications,
    './bloqueio.service': { permitir: async () => {} }, './anexo.service': { validarAnexo: async () => {} } };
  mod.require = key => { assert.ok(Object.hasOwn(deps, key), key); return deps[key]; };
  mod._compile(fs.readFileSync(filename, 'utf8'), filename);
  return mod.exports;
}
function database(forum, image = null) {
  const rows = [], events = [];
  const original = forum ? { id_post: 7n, id_for: 3n, id_usr: 1n, tipo_post: 'MENSAGEM', cont_post: 'Original', img_post: image, usuaria: author }
    : { id_msg: 7n, id_chat: 3n, id_usr_emissor: 1n, cont_msg: 'Original', imagem_msg: image, usuaria: author };
  const db = {
    $transaction: action => action(db), $queryRaw: async () => [],
    chat: { findUnique: async () => ({ id_chat: 3n, id_usr_01: 1n, id_usr_02: 2n }) },
    conexao: { findFirst: async () => ({ status_conexao: 'ACEITO' }) },
    forum: { findUnique: async () => ({ id_for: 3n }) },
    usuaria_forum: { findUnique: async () => ({ id_for: 3n, id_usr: 1n }), findMany: async () => [{ id_usr: 2n }] },
  };
  const model = {
    findUnique: async () => rows[0] || null,
    findFirst: async ({ where }) => {
      assert.equal(forum ? where.id_for : where.id_chat, 3n);
      if (forum) assert.equal(where.tipo_post, 'MENSAGEM');
      return (forum ? where.id_post : where.id_msg) === 7n ? original : null;
    },
    create: async ({ data }) => {
      const saved = { ...data, [forum ? 'id_post' : 'id_msg']: 8n, resposta_id: data.resposta_id ?? null, usuaria: author, resposta: data.resposta_id ? original : null };
      rows.push(saved); return saved;
    },
    findMany: async () => rows,
  };
  db[forum ? 'postagem' : 'mensagem'] = model;
  const service = load(forum ? 'postagem' : 'chat', db, { enabled: () => true, enfileirar: async (tx, event) => events.push(event) });
  const send = dados => forum ? service.criarPostagem('1', '3', dados) : service.enviarMensagem('1', '3', dados.conteudo, dados.imagem ?? null, dados);
  return { db, rows, events, send, service, original };
}
for (const forum of [false, true]) {
  const label = forum ? 'fórum' : 'chat';
  for (const image of [null, '/api/anexos/original.png']) test(`${label}: resposta a ${image ? 'foto' : 'texto'} persiste referência e autora no histórico`, async () => {
    const data = database(forum, image);
    const sent = await data.send({ conteudo: 'Resposta', resposta_id: '7', envio_id: attempt });
    assert.equal(sent.resposta.id, '7'); assert.equal(sent.resposta.autora.nome, 'Autora');
    assert.equal(sent.resposta.imagem, !!image);
    assert.equal(data.rows[0].resposta_id, 7n);
    const history = forum ? await data.service.listarPostagens('1', '3') : await data.service.listarMensagens('1', '3');
    assert.deepEqual(history[0].resposta, sent.resposta);
  });
  test(`${label}: original de outra conversa é recusada sem criar mensagem nem push`, async () => {
    const data = database(forum);
    await assert.rejects(data.send({ conteudo: 'Resposta', resposta_id: '99' }), error => error.statusCode === 400);
    assert.equal(data.rows.length, 0); assert.equal(data.events.length, 0);
  });
  test(`${label}: repetir envio após perder confirmação devolve o mesmo ID sem duplicar foto/push`, async () => {
    const data = database(forum);
    const body = { conteudo: 'Resposta', resposta_id: '7', imagem: '/api/anexos/foto.png', envio_id: attempt };
    const first = await data.send(body), retry = await data.send(body);
    assert.equal(forum ? first.id_post : first.id_msg, forum ? retry.id_post : retry.id_msg);
    assert.equal(data.rows.length, 1); assert.equal(data.events.length, 1);
    await assert.rejects(data.send({ ...body, conteudo: 'Outro conteúdo' }), error => error.statusCode === 409);
  });
}
test('saída repetida cria exatamente um evento de sistema na transação da participação', async () => {
  let member = true;
  const created = [];
  const db = { $transaction: action => action(db), $queryRaw: async () => [],
    forum: { findUnique: async () => ({ id_for: 3n, id_usr_criadora: 2n }) },
    usuaria_forum: { deleteMany: async () => { const count = Number(member); member = false; return { count }; } },
    usuaria: { findUnique: async () => ({ nome_usr: 'Maria' }) },
    postagem: { create: async ({ data }) => created.push(data) },
  };
  const forum = load('forum', db);
  await forum.sairForum('1', '3'); await forum.sairForum('1', '3');
  assert.equal(created.length, 1); assert.equal(created[0].tipo_post, 'SAIDA');
  assert.equal(created[0].cont_post, 'Maria saiu do fórum.');
});
test('aviso de saída não expõe autora e não pode ser editado ou excluído como postagem comum', async () => {
  const data = database(true);
  data.rows.push({ ...data.original, tipo_post: 'SAIDA' });
  const [item] = await data.service.listarPostagens('1', '3');
  assert.equal(item.tipo, 'sistema'); assert.equal(item.autora, undefined);
  await assert.rejects(data.service.editarPostagem('1', '7', { conteudo: 'Forjado' }), error => error.statusCode === 403);
  await assert.rejects(data.service.excluirPostagem('1', '7'), error => error.statusCode === 403);
});
test('opções rejeitam IDs ou chave de envio malformados', () => {
  for (const dados of [{ resposta_id: '../1' }, { resposta_id: '9223372036854775808' }, { envio_id: 'x' }]) {
    assert.throws(() => replies.options(dados), error => error.statusCode === 400);
  }
});
