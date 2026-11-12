const { test } = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const path = require('node:path');

function loadService({
  forum = { id_for: 8n, titulo_for: 'Astro Clube' },
  members = [],
  removedCount = 1,
  reports = [],
  users = [],
} = {}) {
  const calls = { delete: [], audit: [], list: [], users: [] };
  const savedReports = [...reports];
  const prisma = {
    forum: {
      findUnique: async ({ select }) =>
        forum
          ? Object.fromEntries(
              Object.keys(select).map((field) => [field, forum[field]]),
            )
          : null,
      findMany: async ({ where }) =>
        [forum]
          .filter((item) => item && where.id_for.in.includes(item.id_for))
          .map(({ id_for, titulo_for }) => ({ id_for, titulo_for })),
      update: async ({ data }) => ({ titulo_for: data.titulo_for }),
      delete: async () => ({}),
    },
    usuaria_forum: {
      findUnique: async ({ where }) =>
        where.id_for_id_usr.id_for === 8n && where.id_for_id_usr.id_usr === 3n
          ? { id_usr: 3n }
          : null,
      findMany: async (query) => {
        calls.list.push(query);
        return members;
      },
      deleteMany: async (query) => {
        calls.delete.push(query);
        return { count: removedCount };
      },
    },
    usuaria: {
      findMany: async (query) => {
        calls.users.push(query);
        return users.filter((user) => query.where.id_usr.in.includes(user.id_usr));
      },
    },
    relatorio_moderacao: {
      findMany: async () => savedReports,
      create: async ({ data }) => {
        calls.audit.push(data);
        const report = { ...data, id_relat: BigInt(12 + savedReports.length) };
        savedReports.push(report);
        return report;
      },
    },
    $transaction: async (callback) => callback(prisma),
  };
  const filename = path.join(__dirname, '../src/services/moderacao.service.js');
  const mod = new Module(filename, module);
  mod.filename = filename;
  mod.require = (name) => {
    if (name === '../config/prisma') return prisma;
    if (name === './sessao.service') return { emitirSessao: async () => 'token' };
    return require(name);
  };
  mod._compile(require('node:fs').readFileSync(filename, 'utf8'), filename);
  return { service: mod.exports, calls };
}

test('lista participantes do fórum sem expor dados privados e com paginação', async () => {
  const { service, calls } = loadService({
    members: [
      { usuaria: { id_usr: 3n, nome_usr: 'Ana', foto_usr: '/ana.jpg' } },
    ],
  });
  assert.deepEqual(await service.listarUsuariasForum('8', { pagina: '2', limite: '1' }), [
    { id: '3', nome: 'Ana', foto: '/ana.jpg' },
  ]);
  assert.deepEqual(calls.list[0], {
    where: { id_for: 8n },
    select: { usuaria: { select: { id_usr: true, nome_usr: true, foto_usr: true } } },
    orderBy: { usuaria: { nome_usr: 'asc' } },
    skip: 1,
    take: 1,
  });
});

test('remove somente o vínculo com o fórum e registra auditoria', async () => {
  const { service, calls } = loadService({
    users: [
      {
        id_usr: 3n,
        nome_usr: 'Ana Silva',
        email_usr: 'mariasilva@example.invalid',
      },
    ],
  });
  assert.deepEqual(
    await service.removerUsuariaForum(
      '4',
      '8',
      '3',
      '  Descumprimento das regras do fórum.\nReincidência após aviso.  ',
    ),
    { id: '3' },
  );
  assert.deepEqual(calls.delete, [{ where: { id_for: 8n, id_usr: 3n } }]);
  assert.equal(calls.audit.length, 1);
  assert.equal(calls.audit[0].id_mod, 4n);
  assert.equal(calls.audit[0].acao, 'REMOVER_USUARIA_FORUM');
  assert.equal(
    calls.audit[0].desc,
    'Usuária 3 removida do fórum 8.\nAstro Clube\n' +
      'Justificativa: Descumprimento das regras do fórum.\n' +
      'Reincidência após aviso.',
  );
  assert.ok(calls.audit[0].dt_acao instanceof Date);
  const [report] = await service.listarRelatorios('4');
  assert.equal(
    report.descricao,
    'Ana Silva (@mariasilva) foi removida do fórum "Astro Clube".\n' +
      'Justificativa: Descumprimento das regras do fórum.\n' +
      'Reincidência após aviso.',
  );
});

test('exige justificativa antes de remover participante', async () => {
  const { service, calls } = loadService();
  for (const reason of ['', '   ', undefined]) {
    await assert.rejects(
      service.removerUsuariaForum('4', '8', '3', reason),
      { statusCode: 400 },
    );
  }
  assert.equal(calls.delete.length, 0);
  assert.equal(calls.audit.length, 0);
});

test('não registra auditoria se usuária não participa do fórum', async () => {
  const { service, calls } = loadService({ removedCount: 0 });
  await assert.rejects(
    service.removerUsuariaForum('4', '8', '3', 'Motivo da remoção'),
    { statusCode: 404 },
  );
  assert.equal(calls.audit.length, 0);
});

test('retorna 404 para fórum inexistente ao listar ou remover participantes', async () => {
  const { service, calls } = loadService({ forum: null });
  await assert.rejects(service.listarUsuariasForum('8'), { statusCode: 404 });
  await assert.rejects(
    service.removerUsuariaForum('4', '8', '3', 'Motivo da remoção'),
    { statusCode: 404 },
  );
  assert.equal(calls.delete.length, 0);
});

test('resolve identificador de usuária e fórum em registros antigos', async () => {
  const date = new Date('2026-11-12T12:00:00Z');
  const { service, calls } = loadService({
    reports: [
      {
        id_relat: 12n,
        acao: 'REMOVER_USUARIA_FORUM',
        desc: 'Usuária 69 removida do fórum 47.',
        dt_acao: date,
      },
    ],
    users: [
      {
        id_usr: 69n,
        nome_usr: 'Maria Silva',
        email_usr: 'mariasilva@example.invalid',
      },
    ],
    forum: { id_for: 47n, titulo_for: 'Astro Clube' },
  });
  assert.deepEqual(await service.listarRelatorios('4'), [
    {
      id: '12',
      acao: 'REMOVER_USUARIA_FORUM',
      descricao: 'Maria Silva (@mariasilva) foi removida do fórum "Astro Clube".',
      data: date,
    },
  ]);
  assert.deepEqual(calls.users, [
    {
      where: { id_usr: { in: [69n] } },
      select: { id_usr: true, nome_usr: true, email_usr: true },
    },
  ]);
});

test('resolve título do fórum em ações antigas de edição e exclusão', async () => {
  const { service } = loadService({
    reports: [
      {
        id_relat: 12n,
        acao: 'EDICAO_FORUM',
        desc: 'Fórum 8 editado pela moderadora.',
        dt_acao: new Date('2026-11-12T12:00:00Z'),
      },
      {
        id_relat: 13n,
        acao: 'EXCLUSAO_FORUM',
        desc: 'Fórum vazio 8 excluído.',
        dt_acao: new Date('2026-11-12T12:01:00Z'),
      },
    ],
  });
  const reports = await service.listarRelatorios('4');
  assert.equal(reports[0].descricao, 'Fórum "Astro Clube" editado pela moderadora.');
  assert.equal(reports[1].descricao, 'Fórum "Astro Clube" excluído.');
});

test('atualiza somente o título do fórum em descrições antigas já identificadas', async () => {
  const { service } = loadService({
    reports: [
      {
        id_relat: 12n,
        acao: 'REMOVER_USUARIA_FORUM',
        desc: 'Maria Silva (@mariasilva) foi removida do fórum 8.',
        dt_acao: new Date('2026-11-12T12:00:00Z'),
      },
    ],
  });
  const [report] = await service.listarRelatorios('4');
  assert.equal(
    report.descricao,
    'Maria Silva (@mariasilva) foi removida do fórum "Astro Clube".',
  );
});

test('usa título salvo ao listar ação de fórum excluído', async () => {
  const { service } = loadService({
    reports: [
      {
        id_relat: 13n,
        acao: 'EXCLUSAO_FORUM',
        desc: 'Fórum vazio 47 excluído.\nAstronomia',
        dt_acao: new Date('2026-11-12T12:00:00Z'),
      },
    ],
    forum: null,
  });
  const [report] = await service.listarRelatorios('4');
  assert.equal(report.descricao, 'Fórum "Astronomia" excluído.');
});

test('não exibe IDs quando usuária ou fórum não existem mais', async () => {
  const { service } = loadService({
    reports: [
      {
        id_relat: 12n,
        acao: 'REMOVER_USUARIA_FORUM',
        desc: 'Usuária 69 removida do fórum 47.',
        dt_acao: new Date('2026-11-12T12:00:00Z'),
      },
    ],
  });
  const [report] = await service.listarRelatorios('4');
  assert.equal(
    report.descricao,
    'Usuária foi removida do fórum indisponível.',
  );
});
