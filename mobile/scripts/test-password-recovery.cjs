const { test } = require('node:test'),
  assert = require('node:assert/strict'),
  fs = require('node:fs'),
  path = require('node:path'),
  vm = require('node:vm'),
  ts = require('typescript');
require.extensions['.ts'] = (module, filename) =>
  module._compile(
    ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
    filename,
  );
const {
  recoveryEmailSchema,
  recoveryCodeSchema,
  recoveryPasswordSchema,
  recoveryCooldown,
} = require('../src/utils/password-recovery.ts');
test('confirmação diferente impede redefinição; igualdade é aceita', () => {
  assert.equal(
    recoveryPasswordSchema.safeParse({
      novaSenha: 'nova-senha-teste',
      confirmarSenha: 'diferente',
    }).success,
    false,
  );
  assert.equal(
    recoveryPasswordSchema.safeParse({
      novaSenha: 'nova-senha-teste',
      confirmarSenha: 'nova-senha-teste',
    }).success,
    true,
  );
});
test('e-mail e senha respeitam política do cadastro, inclusive bytes UTF-8', () => {
  assert.equal(
    recoveryEmailSchema.safeParse({ email: 'invalido' }).success,
    false,
  );
  for (const value of ['curta', '🌟'.repeat(19)])
    assert.equal(
      recoveryPasswordSchema.safeParse({
        novaSenha: value,
        confirmarSenha: value,
      }).success,
      false,
    );
  assert.equal(
    recoveryPasswordSchema.safeParse({
      novaSenha: '🌟'.repeat(18),
      confirmarSenha: '🌟'.repeat(18),
    }).success,
    true,
  );
});
test('código exige seis dígitos como string e preserva zeros iniciais', () => {
  assert.equal(
    recoveryCodeSchema.safeParse({ codigo: '000123' }).success,
    true,
  );
  for (const value of ['12345', '1234567', '12a456', 123456])
    assert.equal(
      recoveryCodeSchema.safeParse({ codigo: value }).success,
      false,
    );
});
test('reenvio aguarda 60 segundos e libera após o prazo', () => {
  const now = 1000000;
  assert.equal(recoveryCooldown(now, now), 60);
  assert.equal(recoveryCooldown(now, now + 59001), 1);
  assert.equal(recoveryCooldown(now, now + 60000), 0);
});
function service(post) {
  const module = { exports: {} };
  vm.runInNewContext(
    ts.transpileModule(
      fs.readFileSync(
        path.resolve(__dirname, '../src/services/password-recovery.service.ts'),
        'utf8',
      ),
      {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2022,
        },
      },
    ).outputText,
    {
      module,
      exports: module.exports,
      require: (name) => {
        assert.equal(name, './api');
        return { api: { post } };
      },
    },
  );
  return module.exports.passwordRecoveryService;
}
test('integração envia os campos e rotas reais das três etapas', async () => {
  const calls = [],
    s = service(async (path, body) => {
      calls.push({ path, body });
      return { data: { message: 'Resposta sintética de teste' } };
    });
  await s.request('conta@example.invalid');
  await s.verify('conta@example.invalid', '000123');
  await s.reset('conta@example.invalid', '000123', 'nova-senha-teste');
  assert.deepEqual(
    calls.map((c) => c.path),
    [
      '/api/auth/forgot-password',
      '/api/auth/verify-reset-code',
      '/api/auth/reset-password',
    ],
  );
  assert.deepEqual(Object.keys(calls[2].body), [
    'email',
    'codigo',
    'novaSenha',
  ]);
});
test('falha de rede chega ao formulário sem confirmar envio fictício', async () => {
  const failure = new Error('Falha de teste'),
    s = service(async () => {
      throw failure;
    });
  await assert.rejects(
    s.request('conta@example.invalid'),
    (e) => e === failure,
  );
});
