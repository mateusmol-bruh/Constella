const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { readRuntimeConfig } = require('../scripts/check-runtime.cjs');

// Apenas dados sintéticos. Os testes não carregam o .env nem conectam ao banco.
const development = { DATABASE_URL: 'postgresql://localdev:localpass@localhost:5432/testdb', JWT_SECRET: 'segredo-local-existente' };
const production = {
  DATABASE_URL: 'postgresql://deployer:development-only-value@db.internal:5432/testdb',
  JWT_SECRET: '0123456789abcdefABCDEFghijklMNOPqrSTUV', NODE_ENV: 'production'
};
const invalid = field => error => error.code === 'RUNTIME_CONFIG_INVALID' && error.message.includes(field);

test('configuração local existente continua válida sem NODE_ENV e usa a porta padrão', () => {
  assert.deepEqual(readRuntimeConfig(development), {
    nodeEnv: 'development', port: 3000, corsOrigins: [], trustProxy: false
  });
});

test('produção suporta porta customizada, lista web HTTPS explícita e um proxy confiável', () => {
  assert.deepEqual(readRuntimeConfig({ ...production, PORT: '8080', CORS_ALLOWED_ORIGINS: 'https://web.example.invalid/, https://web.example.invalid,https://painel.example.invalid', TRUST_PROXY: '1' }), {
    nodeEnv: 'production', port: 8080,
    corsOrigins: ['https://web.example.invalid', 'https://painel.example.invalid'], trustProxy: 1
  });
});

test('produção com lista CORS vazia não inventa uma origem web', () => {
  assert.deepEqual(readRuntimeConfig(production).corsOrigins, []);
});

test('porta rejeita zero, notação parcial, fração e valores fora do intervalo', () => {
  for (const PORT of ['', '0', '-1', '3000junk', '3e3', '3000.5', '65536', '100000']) {
    assert.throws(() => readRuntimeConfig({ ...development, PORT }), invalid('PORT'));
  }
  assert.equal(readRuntimeConfig({ ...development, PORT: '65535' }).port, 65535);
});

test('ambiente não reconhecido não pode contornar a validação de produção', () => {
  assert.throws(() => readRuntimeConfig({ ...development, NODE_ENV: 'staging' }), invalid('NODE_ENV'));
});

test('URL do banco precisa ser PostgreSQL com host e banco, sem divulgar valor inválido', () => {
  for (const DATABASE_URL of ['', 'valor-privado-invalido', 'mysql://db.internal/testdb', 'postgresql://db.internal/']) {
    assert.throws(() => readRuntimeConfig({ ...production, DATABASE_URL }), error => {
      assert.ok(invalid('DATABASE_URL')(error));
      assert.ok(!DATABASE_URL || !error.message.includes(DATABASE_URL));
      return true;
    });
  }
});

test('produção rejeita credenciais placeholder, mantendo o exemplo utilizável em desenvolvimento', () => {
  const DATABASE_URL = 'postgresql://USUARIO:SENHA@localhost:5432/Constella?schema=public';
  assert.throws(() => readRuntimeConfig({ ...production, DATABASE_URL }), invalid('DATABASE_URL'));
  assert.equal(readRuntimeConfig({ ...development, DATABASE_URL }).nodeEnv, 'development');
});

test('rede privada não obriga desativar nem inventar configuração de TLS', () => {
  assert.equal(readRuntimeConfig(production).nodeEnv, 'production');
  assert.equal(readRuntimeConfig({ ...production, DATABASE_URL: production.DATABASE_URL + '?sslmode=verify-full' }).nodeEnv, 'production');
});

test('JWT é obrigatório e a produção rejeita segredo curto, repetido ou placeholder', () => {
  for (const JWT_SECRET of ['', 'curto', 'a'.repeat(64), 'replace_me_0123456789ABCDEFGHIJKLMNOP']) {
    assert.throws(() => readRuntimeConfig({ ...production, JWT_SECRET }), invalid('JWT_SECRET'));
  }
  assert.throws(() => readRuntimeConfig({ DATABASE_URL: development.DATABASE_URL }), invalid('JWT_SECRET'));
});

test('origens CORS rejeitam wildcard, credenciais, caminhos e origem insegura em produção', () => {
  for (const CORS_ALLOWED_ORIGINS of ['*', 'null', 'https://web.example.invalid/path', 'https://user:pass@web.example.invalid', 'https://web.example.invalid/?q=1', 'https://web.example.invalid/#fragment', 'http://web.example.invalid']) {
    assert.throws(() => readRuntimeConfig({ ...production, CORS_ALLOWED_ORIGINS }), invalid('CORS_ALLOWED_ORIGINS'));
  }
  assert.deepEqual(readRuntimeConfig({ ...development, CORS_ALLOWED_ORIGINS: 'http://localhost:8081' }).corsOrigins, ['http://localhost:8081']);
});

test('trust proxy não permite confiar em qualquer remetente ou número arbitrário de saltos', () => {
  for (const TRUST_PROXY of ['true', '2', '-1', 'loopback', '*']) {
    assert.throws(() => readRuntimeConfig({ ...production, TRUST_PROXY }), invalid('TRUST_PROXY'));
  }
  assert.equal(readRuntimeConfig({ ...production, TRUST_PROXY: '0' }).trustProxy, false);
});

test('mensagens da validação não incluem segredo nem credenciais do banco', () => {
  const secret = 'segredo-curto-privado';
  assert.throws(() => readRuntimeConfig({ ...production, JWT_SECRET: secret }), error => {
    assert.ok(!error.message.includes(secret));
    assert.ok(!error.message.includes(production.DATABASE_URL));
    return invalid('JWT_SECRET')(error);
  });
});

test('CLI retorna falha segura para configuração de produção inválida', () => {
  const script = path.join(__dirname, '../scripts/check-runtime.cjs');
  // O cwd não é backend/: dotenv não lê o .env privado do projeto.
  const result = spawnSync(process.execPath, [script], {
    cwd: path.dirname(__dirname), env: { ...process.env, ...production, JWT_SECRET: 'curto', DOTENV_CONFIG_PATH: path.join(__dirname, '__inexistente__.env') },
    encoding: 'utf8'
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /JWT_SECRET/);
  assert.ok(!result.stderr.includes(production.DATABASE_URL));
  assert.ok(!result.stderr.includes('Error:'));
});

test('imagem inicia Node diretamente, sem migração ou seed automático', () => {
  const dockerfile = fs.readFileSync(path.join(__dirname, '../Dockerfile'), 'utf8');
  const runtime = dockerfile.split('FROM base AS runtime')[1];
  assert.match(runtime, /USER node/);
  assert.match(runtime, /CMD \["node", "server\.js"\]/);
  assert.doesNotMatch(dockerfile, /migrate\s+deploy|migrate\s+reset|db\s+push|db\s+seed/);
  const ignore = fs.readFileSync(path.join(__dirname, '../.dockerignore'), 'utf8').split(/\r?\n/);
  assert.ok(ignore.includes('.env') && ignore.includes('.env.*') && ignore.includes('node_modules'));
});
