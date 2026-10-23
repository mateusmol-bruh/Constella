const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const ts = require('typescript');

// Carrega os módulos TypeScript puros sem dependências nativas.
require.extensions['.ts'] = (module, filename) => {
  const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  module._compile(output.outputText, filename);
};
const { validCpf, utf8Bytes, registerSchema, loginSchema } = require('../src/utils/validation.ts');
const { createDemoRepository } = require('./fixtures/demo.ts');

test('formulários rejeitam entradas inválidas e CPF com dígitos repetidos', () => {
  assert.equal(loginSchema.safeParse({ email: 'lara', senha: 'senha' }).success, false);
  assert.equal(validCpf('11111111111'), false);
  assert.equal(validCpf('12345678900'), false);
  assert.equal(validCpf('111.444.777-35'), true);
  const input = { nome: 'Exemplo', email: 'exemplo@example.com', cpf: '11144477735', senha: 'abcdefgh', confirmarSenha: 'abcdefgh' };
  assert.equal(registerSchema.safeParse(input).success, true);
  assert.equal(registerSchema.safeParse({ ...input, confirmarSenha: 'diferente' }).success, false);
  assert.equal(registerSchema.safeParse({ ...input, senha: '1234567', confirmarSenha: '1234567' }).success, false);
});

test('limite da senha considera bytes UTF-8, inclusive emoji', () => {
  assert.equal(utf8Bytes('aé🌟'), 7);
  const input = { nome: 'Exemplo', email: 'exemplo@example.com', cpf: '11144477735', senha: '🌟'.repeat(18), confirmarSenha: '🌟'.repeat(18) };
  assert.equal(registerSchema.safeParse(input).success, true);
  assert.equal(registerSchema.safeParse({ ...input, senha: '🌟'.repeat(19), confirmarSenha: '🌟'.repeat(19) }).success, false);
});

test('prévia mantém solicitação pendente até aceite e protege início de conversa', async () => {
  const repo = createDemoRepository();
  await assert.rejects(() => repo.startChat('1'));
  await repo.connect('1');
  assert.equal((await repo.sent()).length, 1);
  await assert.rejects(() => repo.connect('1'));
  const request = (await repo.received())[0];
  await repo.respond(request.id_conexao, true);
  assert.equal((await repo.received()).length, 0);
  assert.equal((await repo.connections()).length, 2);
  const chat = await repo.startChat('2');
  assert.equal((await repo.startChat('2')).id_chat, chat.id_chat);
  await repo.sendMessage(chat.id_chat, 'Mensagem de teste');
  assert.equal((await repo.messages(chat.id_chat))[0].conteudo, 'Mensagem de teste');
});

test('prévia altera perfil/interesses/fórum e reinicia sem persistir dados', async () => {
  const repo = createDemoRepository();
  await repo.editProfile({ nome: 'Exemplo', email: 'exemplo@example.com' });
  const interests = await repo.interests();
  await repo.saveInterests(interests.slice(0, 3).map(item => item.id));
  assert.equal((await repo.profile()).nome, 'Exemplo');
  assert.equal((await repo.myInterests()).length, 3);
  await repo.joinForum('f2');
  assert.equal((await repo.forum('f2')).participando, true);
  const forum = await repo.createForum({ titulo: 'Teste', descricao: 'Comunidade de exemplo', capa: null });
  await repo.sendPost(forum.id_for, 'Olá!');
  assert.equal((await repo.posts(forum.id_for))[0].conteudo, 'Olá!');
  const fresh = createDemoRepository();
  assert.equal((await fresh.myInterests()).length, 0);
  assert.equal((await fresh.profile()).apresentacao, '');
  assert.equal((await fresh.profile()).nome, 'Lara');
  assert.equal((await fresh.forums()).length, 3);
});
