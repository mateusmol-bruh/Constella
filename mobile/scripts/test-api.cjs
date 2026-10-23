const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const axios = require('axios');

// Testa o cliente real com adapter Axios em memória: não sobe API simulada,
// não acessa .env e nunca usa credenciais ou conexão de rede.
function loadApi(url = 'http://127.0.0.1:3000') {
  const filename = path.resolve(__dirname, '../src/services/api.ts');
  const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(source, {
    module, exports: module.exports,
    require(name) {
      assert.equal(name, 'axios', 'O cliente HTTP não deve depender de APIs nativas neste teste.');
      return axios;
    },
    process: { env: url === undefined ? {} : { EXPO_PUBLIC_API_URL: url } },
    Error,
  }, { filename });
  return module.exports;
}

function httpError(config, status, data = {}) {
  return new axios.AxiosError('Falha HTTP de teste', axios.AxiosError.ERR_BAD_RESPONSE, config, null, {
    config, status, statusText: String(status), data, headers: {},
  });
}

test('baseURL remove /api e barras finais, mantém timeout e resposta de sucesso', async () => {
  for (const url of ['http://127.0.0.1:3000/api/', ' http://127.0.0.1:3000/api/// ', 'http://127.0.0.1:3000/']) {
    const { api, apiUrl } = loadApi(url);
    assert.equal(apiUrl, 'http://127.0.0.1:3000');
    assert.equal(api.defaults.timeout, 15000);
    api.defaults.adapter = async config => {
      assert.equal(api.getUri(config), 'http://127.0.0.1:3000/api/perfil');
      return { status: 200, statusText: 'OK', data: { id_usr: 'teste' }, headers: {}, config };
    };
    const response = await api.get('/api/perfil');
    assert.equal(response.status, 200);
    assert.equal(response.data.id_usr, 'teste');
  }
});

test('cliente bloqueia URL ausente/inválida antes de qualquer request', async () => {
  for (const url of ['', 'ftp://127.0.0.1:3000', 'API_NAO_CONFIGURADA']) {
    const { api, errorMessage } = loadApi(url);
    let calls = 0;
    api.defaults.adapter = async () => { calls += 1; throw new Error('Adapter não deveria executar'); };
    await assert.rejects(api.get('/api/perfil'), error => {
      assert.equal(error.message, 'API_NAO_CONFIGURADA');
      assert.match(errorMessage(error), /servidor.*configurado/i);
      return true;
    });
    assert.equal(calls, 0);
  }
});

test('JWT só acompanha rotas privadas; login/cadastro e sessão limpa não recebem token', async () => {
  const { api, setApiSession } = loadApi();
  let expectedAuthorization;
  api.defaults.adapter = async config => {
    assert.equal(config.headers.Authorization, expectedAuthorization);
    return { status: 200, statusText: 'OK', data: {}, headers: {}, config };
  };
  setApiSession('token-sintetico-em-memoria');
  expectedAuthorization = 'Bearer token-sintetico-em-memoria';
  await api.get('/api/perfil');
  expectedAuthorization = undefined;
  await api.post('/api/auth/login', {});
  await api.post('/api/auth/cadastro', {});
  api.defaults.headers.common.Authorization = 'Bearer residuo-sintetico';
  await api.post('/api/auth/login', {});
  setApiSession(null);
  await api.get('/api/perfil');
});

test('401 atrasado da sessão anterior não encerra uma sessão nova', async () => {
  const { api, setApiSession, setSessionExpiredHandler } = loadApi();
  let expired = 0;
  setSessionExpiredHandler(() => { expired += 1; });
  setApiSession('sessao-antiga-sintetica');
  let rejectOld;
  let oldConfig;
  let signalStarted;
  const started = new Promise(resolve => { signalStarted = resolve; });
  api.defaults.adapter = config => {
    oldConfig = config;
    signalStarted();
    return new Promise((_, reject) => { rejectOld = reject; });
  };
  const oldRequest = api.get('/api/perfil');
  const rejected = assert.rejects(oldRequest, error => error.response?.status === 401);
  await started;
  setApiSession('sessao-nova-sintetica');
  rejectOld(httpError(oldConfig, 401));
  await rejected;
  assert.equal(expired, 0);

  api.defaults.adapter = config => Promise.reject(httpError(config, 401));
  await assert.rejects(api.get('/api/perfil'));
  assert.equal(expired, 1, '401 da sessão atual deve expirar a sessão.');
  await assert.rejects(api.post('/api/auth/login', {}));
  assert.equal(expired, 1, '401 do login não deve encerrar sessão privada.');
  setApiSession(null);
  await assert.rejects(api.get('/api/perfil'));
  assert.equal(expired, 1);
});

test('erros distinguem offline, timeout, validação, sessão, permissão, ausência, conflito, limite e servidor', async () => {
  const { api, errorMessage } = loadApi();
  const cases = [
    { code: 'ERR_NETWORK', pattern: /conectar.*conexão/i },
    { code: 'ECONNABORTED', pattern: /demorou.*responder/i },
    { code: 'ETIMEDOUT', pattern: /demorou.*responder/i },
    { status: 400, pattern: /dados informados/i },
    { status: 401, pattern: /sessão expirada|credenciais inválidas/i },
    { status: 403, pattern: /permissão/i },
    { status: 404, pattern: /não está mais disponível/i },
    { status: 409, pattern: /já existe/i },
    { status: 429, pattern: /muitas tentativas/i },
    { status: 500, pattern: /servidor.*não conseguiu/i },
  ];
  for (const entry of cases) {
    api.defaults.adapter = config => Promise.reject(entry.status
      ? httpError(config, entry.status)
      : new axios.AxiosError('Falha de transporte de teste', entry.code, config));
    await assert.rejects(api.get('/api/perfil'), error => {
      assert.match(errorMessage(error), entry.pattern);
      return true;
    });
  }
  assert.equal(errorMessage(httpError({}, 400, { mensagem: 'Campo inválido no contrato.' })), 'Campo inválido no contrato.');
  assert.match(errorMessage(httpError({}, 503, { codigo: 'ONBOARDING_MIGRACAO_PENDENTE' })), /configuração inicial.*indisponível/i);
  assert.match(errorMessage(new Error('Falha desconhecida')), /não foi possível concluir/i);
});
