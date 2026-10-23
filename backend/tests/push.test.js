const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
function load(name, dependencies) {
  const filename = path.join(__dirname, '../src/services', `${name}.service.js`);
  const mod = new Module(filename, module);
  mod.filename = filename;
  mod.require = key => { assert.ok(Object.hasOwn(dependencies, key), key); return dependencies[key]; };
  mod._compile(fs.readFileSync(filename, 'utf8'), filename);
  return mod.exports;
}
function notificationService(prisma) {
  return load('notificacao', { '../config/prisma': prisma, './bloqueio.service': { id: value => BigInt(value) } });
}
const sample = () => ({ id_push: 1n, id_usr: 2n, token: 'ExpoPushToken[TESTE_sem_destinatario_real]', estado: 'PENDENTE', tentativas: 0, chave: 'mensagem:8', dados: { tipo: 'chat', id: '4', autor: '1', destinataria: '2' }, criado_em: new Date(), dispositivo: { ativo: true, id_usr: 2n } });

test('token inválido e plataforma arbitrária não chegam ao banco', async () => {
  const service = notificationService({});
  for (const token of [null, 'https://example.invalid', 'ExpoPushToken[x]', 'segredo']) {
    await assert.rejects(service.registrar('1', { token, plataforma: 'android' }), error => error.statusCode === 400);
  }
  await assert.rejects(service.registrar('1', { token: sample().token, plataforma: 'web' }), error => error.statusCode === 400);
});
test('fila exclui a autora e usa chave única por evento e dispositivo', async () => {
  const previous = process.env.CONSTELLA_PUSH_ENABLED;
  process.env.CONSTELLA_PUSH_ENABLED = 'true';
  try {
    const service = notificationService({});
    let created;
    const tx = {
      dispositivo_push: { findMany: async query => { assert.deepEqual(query.where.id_usr.in, [2n]); return [{ token: sample().token, id_usr: 2n }]; } },
      notificacao_push: { createMany: async data => { created = data; } },
    };
    await service.enfileirar(tx, { chave: 'mensagem:8', tipo: 'chat', recurso: 4n, autor: 1n, destinatarias: [1n, 2n, 2n], foto: true });
    assert.equal(created.skipDuplicates, true);
    assert.equal(created.data.length, 1);
    assert.equal(created.data[0].dados.foto, true);
    assert.equal(created.data[0].id_usr, 2n);
  } finally { if (previous === undefined) delete process.env.CONSTELLA_PUSH_ENABLED; else process.env.CONSTELLA_PUSH_ENABLED = previous; }
});
test('logout desativa somente o dispositivo da conta autenticada e cancela pendências', async () => {
  const calls = [];
  const tx = { dispositivo_push: { updateMany: async data => calls.push(data) }, notificacao_push: { updateMany: async data => calls.push(data) } };
  const service = notificationService({ $transaction: action => action(tx) });
  await service.desregistrar('2', sample().token);
  assert.equal(calls[0].where.id_usr, 2n); assert.equal(calls[0].data.ativo, false);
  assert.equal(calls[1].where.id_usr, 2n); assert.equal(calls[1].data.estado, 'CANCELADA');
});
test('bloqueio, leitura e saída de fórum impedem entrega pendente', async () => {
  const row = sample();
  const blocked = notificationService({ bloqueio: { findFirst: async () => ({}) } });
  assert.equal(await blocked.permitido(row), false);
  const read = notificationService({ bloqueio: { findFirst: async () => null }, mensagem: { findUnique: async () => ({ id_msg: 8n, id_chat: 4n, chat: { id_usr_01: 1n, id_usr_02: 2n } }) }, chat_leitura: { findUnique: async () => ({ ultima_mensagem: 8n }) } });
  assert.equal(await read.permitido(row), false);
  const left = notificationService({ bloqueio: { findFirst: async () => null }, usuaria_forum: { findUnique: async () => null }, postagem: { findUnique: async () => ({id_post: 8n}) } });
  assert.equal(await left.permitido({ ...row, chave: 'postagem:8', dados: { ...row.dados, tipo: 'forum' } }), false);
  assert.equal(await blocked.permitido({ ...row, dispositivo: { ativo: true, id_usr: 3n } }), false);
});
function worker(allowed = true, claim = true) {
  const updates = [], devices = [];
  const prisma = {
    notificacao_push: { updateMany: async query => { updates.push(query); return { count: query.where.estado === 'PENDENTE' ? Number(claim) : 1 }; } },
    dispositivo_push: { updateMany: async query => devices.push(query) },
  };
  return { updates, devices, api: load('push-worker', { '../config/prisma': prisma, './notificacao.service': { permitido: async () => allowed, enabled: () => true } }) };
}
test('ticket Expo aceito fica aguardando recibo; não é marcado como recebido no aparelho', async () => {
  const instance = worker();
  await instance.api.enviar(sample(), async(url, options) => {
    assert.ok(url.endsWith('/send'));
    const body = JSON.parse(options.body); assert.equal(body.data.destinataria, '2');
    assert.equal(body.body, 'Você recebeu uma nova mensagem.');
    return { ok: true, json: async () => ({ data: { status: 'ok', id: 'ticket-teste' } }) };
  });
  assert.equal(instance.updates.at(-1).data.estado, 'AGUARDANDO');
});
test('falha de rede incerta não reenvia cegamente; 429 usa tentativa posterior', async () => {
  const uncertain = worker();
  await uncertain.api.enviar(sample(), async () => { throw new Error('rede'); });
  assert.equal(uncertain.updates.at(-1).data.estado, 'INCERTA');
  const retry = worker();
  await retry.api.enviar(sample(), async () => ({ ok: false, status: 429 }));
  assert.equal(retry.updates.at(-1).data.estado, 'PENDENTE');
  assert.ok(retry.updates.at(-1).data.proxima_tentativa > new Date());
});
test('token inválido é desativado; evento já reservado e acesso revogado não enviam', async () => {
  const invalid = worker();
  await invalid.api.enviar(sample(), async () => ({ ok: true, json: async () => ({ data: { status: 'error', details: { error: 'DeviceNotRegistered' } } }) }));
  assert.equal(invalid.devices[0].data.ativo, false);
  for (const instance of [worker(false), worker(true, false)]) {
    await instance.api.enviar(sample(), async () => assert.fail('Não deve enviar push'));
  }
});
