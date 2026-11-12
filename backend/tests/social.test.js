const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');

// Carrega apenas o módulo sob teste; a configuração Prisma real nunca é executada.
function load(relative, dependencies) {
  const filename = path.join(__dirname, '..', 'src', relative);
  const isolated = new Module(filename, module);
  isolated.filename = filename;
  isolated.require = name => {
    assert.ok(Object.hasOwn(dependencies, name), `Dependência não simulada: ${name}`);
    return dependencies[name];
  };
  isolated._compile(fs.readFileSync(filename, 'utf8'), filename);
  return isolated.exports;
}
const service = (name, prisma) => {
  prisma.$transaction ??= action => action(prisma);
  prisma.$queryRaw ??= async () => [];
  return load(`services/${name}.service.js`, { '../config/prisma': prisma, './resposta.service': require('../src/services/resposta.service'), './notificacao.service': { enabled: () => false, enfileirar: async () => {} } });
};
const forbidden = () => assert.fail('Operação Prisma não autorizada foi chamada.');
const status = code => error => error.statusCode === code;
const post = {
  id_post: 9n, id_usr: 1n, id_for: 3n, cont_post: 'Olá', img_post: null,
  dt_post: new Date('2026-10-23T12:00:00Z'),
  usuaria: { id_usr: 1n, nome_usr: 'Autora', foto_usr: null, email_usr: 'privado', cpf_usr: 'privado' },
};
function forumPrisma(member = true) {
  return {
    forum: { findUnique: async () => ({ id_for: 3n }) },
    usuaria_forum: { findUnique: async () => member ? { id_usr: 1n, id_for: 3n } : null },
    postagem: { findMany: forbidden, create: forbidden, findUnique: async () => post, update: forbidden, delete: forbidden },
  };
}
function privatePrisma() {
  return {
    chat: { findUnique: async () => ({ id_chat: 4n, id_usr_01: 1n, id_usr_02: 2n }) },
    conexao: { findFirst: async () => ({ id_conexao: 5n, status_conexao: 'ACEITO' }) },
    mensagem: { findMany: forbidden, create: forbidden, findFirst: forbidden, deleteMany: forbidden },
  };
}

test('metadados do fórum são visíveis sem vínculo e não contêm dados privados', async () => {
  const forum = service('forum', {
    forum: { findUnique: async () => ({
      id_for: 3n, titulo_for: 'Comunidade', desc_for: null, capa_for: null,
      usuaria: post.usuaria, usuaria_forum: [], _count: { usuaria_forum: 2, postagem: 1 },
    }) },
  });
  const result = await forum.buscarForum('7', '3');
  assert.equal(result.participando, false);
  assert.deepEqual(result.criadora, { id: '1', nome: 'Autora', foto: null });
  assert.ok(!JSON.stringify(result).includes('privado'));
});

test('posts exigem vínculo tanto para leitura como envio', async () => {
  const posts = service('postagem', forumPrisma(false));
  await assert.rejects(posts.listarPostagens('1', '3'), status(403));
  await assert.rejects(posts.criarPostagem('1', '3', { conteudo: 'Olá', id_usr: '99' }), status(403));
});

test('histórico de fórum limita páginas, desempata por ID e retorna somente autora pública', async () => {
  const prisma = forumPrisma();
  prisma.postagem.findMany = async query => {
    assert.deepEqual(query.where, { id_for: 3n });
    assert.deepEqual(query.orderBy, [{ dt_post: 'desc' }, { id_post: 'desc' }]);
    assert.deepEqual(query.include.usuaria.select, { id_usr: true, nome_usr: true, foto_usr: true });
    assert.equal(query.skip, 50); assert.equal(query.take, 50);
    return [post];
  };
  const result = await service('postagem', prisma).listarPostagens('1', '3', 2, 50);
  assert.equal(result[0].id_post, '9');
  assert.deepEqual(result[0].autora, { id: '1', nome: 'Autora', foto: null });
  assert.ok(!JSON.stringify(result).includes('privado'));
});

test('paginação inválida de postagens falha antes de acessar o banco', async () => {
  const posts = service('postagem', {});
  for (const [pagina, limite] of [[0, 50], [1.5, 50], [1, 51], [1, 0], [Infinity, 50], [Number.MAX_SAFE_INTEGER, 50]]) {
    await assert.rejects(posts.listarPostagens('1', '3', pagina, limite), status(400));
  }
});

test('criação de postagem usa a autora autenticada e ignora ID forjado do payload', async () => {
  const prisma = forumPrisma();
  prisma.postagem.create = async query => {
    assert.deepEqual(query.data, { id_usr: 1n, id_for: 3n, cont_post: 'Olá', img_post: null });
    return post;
  };
  const result = await service('postagem', prisma).criarPostagem('1', '3', { conteudo: '  Olá  ', id_usr: '99' });
  assert.equal(result.autora.id, '1');
});

test('somente autora ainda participante pode editar ou excluir postagem', async () => {
  const posts = service('postagem', forumPrisma());
  await assert.rejects(posts.editarPostagem('2', '9', { conteudo: 'Alteração' }), status(403));
  await assert.rejects(posts.excluirPostagem('2', '9'), status(403));
  const formerMember = service('postagem', forumPrisma(false));
  await assert.rejects(formerMember.editarPostagem('1', '9', { conteudo: 'Alteração' }), status(403));
  await assert.rejects(formerMember.excluirPostagem('1', '9'), status(403));
});

test('exclusão com denúncia relacionada retorna conflito preservando a referência', async () => {
  const prisma = forumPrisma();
  prisma.postagem.delete = async () => { throw Object.assign(new Error('FK'), { code: 'P2003' }); };
  await assert.rejects(service('postagem', prisma).excluirPostagem('1', '9'), status(409));
});

test('denúncia de postagem exige vínculo e não aceita conteúdo próprio', async () => {
  const reports = service('denuncia', forumPrisma(false));
  await assert.rejects(reports.denunciarPostagem('2', '9', 'Motivo'), status(403));
  await assert.rejects(reports.denunciarPostagem('1', '9', 'Motivo'), status(400));
});

test('denúncia de participante segue o contrato e cria vínculo para a moderação', async () => {
  const prisma = forumPrisma();
  prisma.moderadora = { findFirst: async () => ({ id_mod: 5n }) };
  const captured = [];
  prisma.$transaction = async callback => callback({
    denuncia: { create: async query => {
      captured.push(query.data);
      return { ...query.data, id_den: 6n, dt_denuncia: new Date() };
    } },
    denuncia_postagem: { create: async query => { captured.push(query.data); } },
  });
  const result = await service('denuncia', prisma).denunciarPostagem('2', '9', '  Motivo  ');
  assert.equal(result.status, 'PENDENTE');
  assert.deepEqual(captured[0], { motivo_den: 'Motivo', descricao: null, status: 'PENDENTE', id_mod: 5n, id_usr_denunciante: 2n });
  assert.deepEqual(captured[1], { id_den: 6n, id_post: 9n });
});

test('chat privado nega leitura, envio e exclusão a usuária externa', async () => {
  const chat = service('chat', privatePrisma());
  await assert.rejects(chat.listarMensagens('3', '4'), status(403));
  await assert.rejects(chat.enviarMensagem('3', '4', 'Olá'), status(403));
  await assert.rejects(chat.excluirMensagem('3', '4', '8'), status(403));
});

test('chat privado verifica se a conexão continua aceita', async () => {
  const prisma = privatePrisma();
  prisma.conexao.findFirst = async () => null;
  const chat = service('chat', prisma);
  await assert.rejects(chat.listarMensagens('1', '4'), status(403));
  await assert.rejects(chat.enviarMensagem('1', '4', 'Olá'), status(403));
  await assert.rejects(chat.excluirMensagem('1', '4', '8'), status(403));
});

test('histórico privado mantém a paginação e retorna conteúdo em ordem cronológica', async () => {
  const prisma = privatePrisma();
  prisma.mensagem.findMany = async query => {
    assert.deepEqual(query.where, { id_chat: 4n });
    assert.deepEqual(query.orderBy, [{ dt_envio: 'desc' }, { id_msg: 'desc' }]);
    assert.equal(query.skip, 50); assert.equal(query.take, 50);
    return [8n, 7n].map(id_msg => ({ id_msg, id_chat: 4n, id_usr_emissor: 2n, cont_msg: 'Olá', dt_envio: post.dt_post }));
  };
  const result = await service('chat', prisma).listarMensagens('1', '4', 2, 50);
  assert.deepEqual(result.map(item => item.id_msg), ['7', '8']);
});

test('exclusão privada é limitada à mensagem própria dentro do chat autorizado', async () => {
  const prisma = privatePrisma();
  prisma.mensagem.findFirst = async query => {
    assert.deepEqual(query.where, { id_msg: 8n, id_chat: 4n });
    return { id_msg: 8n, id_usr_emissor: 2n };
  };
  await assert.rejects(service('chat', prisma).excluirMensagem('1', '4', '8'), status(403));
  prisma.mensagem.findFirst = async () => ({ id_msg: 8n, id_usr_emissor: 1n });
  prisma.mensagem.deleteMany = async query => {
    assert.deepEqual(query.where, { id_msg: 8n, id_chat: 4n, id_usr_emissor: 1n });
    return { count: 1 };
  };
  await service('chat', prisma).excluirMensagem('1', '4', '8');
});

test('mensagem privada com denúncia relacionada retorna conflito sem apagar a denúncia', async () => {
  const prisma = privatePrisma();
  prisma.mensagem.findFirst = async () => ({ id_msg: 8n, id_usr_emissor: 1n });
  prisma.mensagem.deleteMany = async () => { throw Object.assign(new Error('FK'), { code: 'P2003' }); };
  await assert.rejects(service('chat', prisma).excluirMensagem('1', '4', '8'), status(409));
});

test('entrada simultânea no mesmo fórum retorna conflito de participação', async () => {
  const prisma = forumPrisma(false);
  prisma.postagem.findFirst = async () => null;
  prisma.usuaria_forum.create = async () => { throw Object.assign(new Error('Unique'), { code: 'P2002' }); };
  await assert.rejects(service('forum', prisma).entrarForum('1', '3'), status(409));
});

test('denúncia de mensagem privada recusa participantes externos', async () => {
  const reports = service('denuncia', {
    mensagem: { findUnique: async () => ({ id_msg: 8n, id_usr_emissor: 1n, chat: { id_usr_01: 1n, id_usr_02: 2n } }) },
  });
  await assert.rejects(reports.denunciarMensagem('3', '8', 'Motivo'), status(403));
});

test('controlador de envio usa identidade autenticada ignorando o corpo forjado', async () => {
  const controller = load('controllers/chat.controller.js', {
    '../utils/conversation-error': require('../src/utils/conversation-error'),
    '../services/chat.service': {
      enviarMensagem: async (...args) => { assert.deepEqual(args, ['1', '4', 'Olá', null, { resposta_id: undefined, envio_id: undefined }]); return { id_msg: '8' }; },
    },
  });
  const res = { status(code) { assert.equal(code, 201); return this; }, json(body) { assert.equal(body.dados.id_msg, '8'); } };
  await controller.enviarMensagem({ usuarioId: '1', params: { id: '4' }, body: { conteudo: '  Olá  ', id_usr_emissor: '99' } }, res);
});
