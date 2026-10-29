const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const ts = require('typescript');

require.extensions['.ts'] = (module, filename) => {
  const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  module._compile(output.outputText, filename);
};
const { hasProAccess, proStatusLabel } = require('../src/utils/pro.ts');

test('Pro mostra gratuita e pendente sem liberar acesso', () => {
  assert.equal(proStatusLabel({ status: 'inativa', ativo: false }), 'Sem assinatura ativa');
  assert.equal(proStatusLabel({ status: 'pendente_validacao', ativo: false }), 'Aguardando validação');
  assert.equal(hasProAccess({ status: 'pendente_validacao', ativo: false }), false);
});

test('Pro depende do entitlement do servidor, não apenas do nome do status', () => {
  assert.equal(hasProAccess({ status: 'ativa', ativo: false }), false);
  assert.equal(hasProAccess({ status: 'ativa', ativo: true }), true);
  assert.equal(proStatusLabel({ status: 'ativa', ativo: false }), 'Acesso aguardando validação');
});

test('expirada e cancelada têm apresentação própria; cancelada pode ter vigência', () => {
  assert.equal(proStatusLabel({ status: 'expirada', ativo: false }), 'Assinatura expirada');
  assert.equal(hasProAccess({ status: 'expirada', ativo: true }), false);
  assert.equal(proStatusLabel({ status: 'cancelada', ativo: false }), 'Assinatura cancelada');
  assert.equal(hasProAccess({ status: 'cancelada', ativo: false }), false);
  assert.equal(hasProAccess({ status: 'cancelada', ativo: true }), true);
});
