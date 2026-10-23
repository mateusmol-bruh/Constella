const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
function fixture(pro, count) {
  let created = 0, locked = false;
  const tx = {
    $queryRaw: async () => { locked = true; },
    forum: { count: async () => { assert.ok(locked); return count; }, create: async ({ data }) => { created++; return { ...data, id_for: 10n }; } },
    usuaria_forum: { create: async () => {} },
  };
  const prisma = { usuaria: { findUnique: async () => ({ id_usr: 1n }) }, moderadora: { findFirst: async () => ({ id_mod: 1n }) }, $transaction: action => action(tx) };
  const filename = path.join(__dirname, '../src/services/forum.service.js');
  const mod = new Module(filename, module); mod.filename = filename;
  mod.require = name => {
    if (name === '../config/prisma') return prisma;
    assert.equal(name, './assinatura.service'); return { buscarStatusAssinatura: async () => ({ ativo: pro }) };
  };
  mod._compile(fs.readFileSync(filename, 'utf8'), filename);
  return { service: mod.exports, created: () => created };
}
test('gratuita cria o primeiro fórum e vira participante automaticamente', async () => {
  const app = fixture(false, 0);
  assert.equal((await app.service.criarForum('1', { titulo: 'Primeiro', descricao: '' })).id_for, '10');
  assert.equal(app.created(), 1);
});
test('payload PRO forjado não burla o limite e não grava segundo fórum', async () => {
  const app = fixture(false, 1);
  await assert.rejects(app.service.criarForum('1', { titulo: 'Segundo', pro: true }), error => error.statusCode === 403 && error.codigo === 'LIMITE_FORUNS_GRATUITO');
  assert.equal(app.created(), 0);
});
test('acesso PRO validado pelo servidor permite criar além do primeiro', async () => {
  const app = fixture(true, 3);
  await app.service.criarForum('1', { titulo: 'Mais um' });
  assert.equal(app.created(), 1);
});
