const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');

function loadService({ forum = { id_for: 8n }, participation = { id_usr: 3n }, members = [] } = {}) {
  const prisma = {
    forum: { findUnique: async () => forum },
    usuaria_forum: {
      findUnique: async () => participation,
      findMany: async ({ where }) => {
        assert.equal(where.id_for, 8n);
        return members;
      },
    },
  };
  const filename = path.join(__dirname, '../src/services/forum.service.js');
  const mod = new Module(filename, module);
  mod.filename = filename;
  mod.require = name => {
    assert.equal(name, '../config/prisma');
    return prisma;
  };
  mod._compile(fs.readFileSync(filename, 'utf8'), filename);
  return mod.exports;
}

test('lista somente os perfis vinculados ao fórum solicitado', async () => {
  const service = loadService({ members: [
    { usuaria: { id_usr: 3n, nome_usr: 'Ana', foto_usr: '/ana.jpg' } },
    { usuaria: { id_usr: 4n, nome_usr: 'Bia', foto_usr: null } },
  ] });
  assert.deepEqual(await service.listarMembros('3', '8'), [
    { id: '3', nome: 'Ana', foto: '/ana.jpg' },
    { id: '4', nome: 'Bia', foto: null },
  ]);
});

test('retorna todos os membros de fóruns com listas extensas', async () => {
  const members = Array.from({ length: 80 }, (_, index) => ({
    usuaria: { id_usr: BigInt(index + 3), nome_usr: `Participante ${index + 1}`, foto_usr: null },
  }));
  const service = loadService({ members });
  const result = await service.listarMembros('3', '8');
  assert.equal(result.length, 80);
  assert.equal(result.at(-1).nome, 'Participante 80');
});

test('impede que não participantes consultem a lista de membros', async () => {
  const service = loadService({ participation: null });
  await assert.rejects(service.listarMembros('9', '8'), error => error.statusCode === 403);
});

test('retorna 404 para fórum inexistente', async () => {
  const service = loadService({ forum: null });
  await assert.rejects(service.listarMembros('3', '8'), error => error.statusCode === 404);
});