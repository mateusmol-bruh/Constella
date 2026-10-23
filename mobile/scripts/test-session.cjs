const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const tick = () => new Promise(resolve => setImmediate(resolve));
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function profile(id = 'conta-a', completed = false) {
  return { id, nome: 'Teste', email: 'teste@example.invalid', interesses: [], onboarding_concluido: completed, apresentacao: 'Texto salvo' };
}
function response(id = 'conta-a', completed = false) {
  return { token: `sessao-sintetica-${id}`, usuaria: profile(id, completed) };
}

// Executa o AuthProvider real com hooks determinísticos e SecureStore em memória.
// Não acessa .env, APIs nativas, rede ou credenciais reais.
function mount(initialToken = null) {
  const slots = [];
  const effects = [];
  const cleanups = [];
  let cursor = 0, stored = initialToken, token = null, expired;
  const api = {
    setApiSession(value) { token = value; },
    setSessionExpiredHandler(handler) { expired = handler; },
    errorMessage(error) { return error.message; },
  };
  const react = {
    createElement(type, props) { return { type, props }; },
    createContext() { return { Provider: Symbol('Provider') }; },
    useContext() { throw new Error('Use o valor retornado pelo Provider neste teste.'); },
    useState(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = initial;
      return [slots[index], value => { slots[index] = typeof value === 'function' ? value(slots[index]) : value; }];
    },
    useRef(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = { current: initial };
      return slots[index];
    },
    useEffect(effect) {
      const index = cursor++;
      if (!(index in slots)) { slots[index] = true; effects.push(effect); }
    },
  };
  const secureStore = {
    async getItemAsync() { return stored; },
    async setItemAsync(key, value) { stored = value; },
    async deleteItemAsync() { stored = null; },
  };
  const authService = {
    async login() { return response(); },
    async register() { return response(); },
    async completeOnboarding() { return profile('conta-a', true); },
  };
  const communityService = { async profile() { return profile('conta-a', true); } };
  const imports = {
    react: { __esModule: true, default: react, ...react },
    'react-native': { Platform: { OS: 'android' } },
    'expo-secure-store': secureStore,
    '../services/auth.service': { authService },
    '../services/community.service': { communityService },
    '../services/api': api,
  };
  const filename = path.resolve(__dirname, '../src/constexts/AuthContext.tsx');
  const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React, esModuleInterop: true },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(source, {
    module, exports: module.exports, Error,
    require(name) {
      assert.ok(Object.hasOwn(imports, name), `Dependência inesperada: ${name}`);
      return imports[name];
    },
  }, { filename });
  function state() {
    cursor = 0;
    return module.exports.AuthProvider({ children: null }).props.value;
  }
  state();
  for (const effect of effects) cleanups.push(effect());
  return {
    state, secureStore, authService, communityService,
    expire() { assert.equal(typeof expired, 'function'); expired(); },
    stored() { return stored; }, token() { return token; },
    unmount() { for (const cleanup of cleanups) cleanup?.(); },
  };
}

test('conta nova começa vazia e conclusão com zero interesses depende da confirmação real', async () => {
  const app = mount();
  await tick();
  await app.state().login('', '');
  assert.equal(app.state().needsOnboarding, true);
  assert.equal(app.state().about, '');
  app.authService.completeOnboarding = async input => {
    assert.equal(input.interesses.length, 0);
    assert.equal(input.apresentacao, '');
    return profile('conta-a', false);
  };
  await assert.rejects(app.state().finishOnboarding([]), /não confirmada/);
  assert.equal(app.state().needsOnboarding, true);
  app.authService.completeOnboarding = async () => profile('conta-a', true);
  await app.state().finishOnboarding([]);
  assert.equal(app.state().needsOnboarding, false);
  app.unmount();
});

test('outro dispositivo e novo login preservam conclusão mesmo sem interesses', async () => {
  const app = mount('sessao-sintetica-salva');
  await tick();
  assert.equal(app.state().needsOnboarding, false);
  assert.equal(app.state().about, 'Texto salvo');
  await app.state().logout();
  assert.equal(app.stored(), null);
  assert.equal(app.token(), null);
  assert.equal(app.state().user, null);
  app.authService.login = async () => response('conta-a', true);
  await app.state().login('', '');
  assert.equal(app.state().needsOnboarding, false);
  app.unmount();
});

test('falha de rede na restauração mantém estado desconhecido e permite recuperar a sessão', async () => {
  const app = mount('sessao-sintetica-salva');
  app.communityService.profile = async () => { throw new Error('Sem conexão de teste'); };
  await tick();
  assert.equal(app.state().user, null);
  assert.equal(app.state().needsOnboarding, null);
  assert.equal(app.state().restoreFailed, true);
  assert.equal(app.state().restoring, false);
  assert.equal(app.stored(), 'sessao-sintetica-salva');
  app.communityService.profile = async () => profile('conta-a', true);
  await app.state().retrySession();
  assert.equal(app.state().restoreFailed, false);
  assert.equal(app.state().needsOnboarding, false);
  app.unmount();
});

test('JWT expirado na restauração encerra sessão sem classificar a conta como nova', async () => {
  const app = mount('sessao-sintetica-expirada');
  app.communityService.profile = async () => { app.expire(); throw new Error('401 de teste'); };
  await tick();
  assert.equal(app.state().user, null);
  assert.equal(app.state().needsOnboarding, null);
  assert.equal(app.state().restoreFailed, false);
  assert.equal(app.state().restoring, false);
  assert.equal(app.stored(), null);
  assert.equal(app.token(), null);
  assert.match(app.state().notice, /sessão expirou/);
  app.unmount();
});

test('exclusão atrasada de sessão expirada termina antes de salvar o novo JWT', async () => {
  const app = mount();
  await tick();
  await app.state().login('', '');
  const clearing = deferred();
  const originalClear = app.secureStore.deleteItemAsync;
  app.secureStore.deleteItemAsync = async key => { await clearing.promise; await originalClear(key); };
  app.expire();
  await tick();
  app.authService.login = async () => response('conta-b', true);
  const login = app.state().login('', '');
  await tick();
  assert.equal(app.state().user, null);
  clearing.resolve();
  await login;
  assert.equal(app.state().user.id, 'conta-b');
  assert.equal(app.stored(), response('conta-b').token);
  assert.equal(app.token(), app.stored());
  app.unmount();
});

test('logout invalida autenticação ainda em andamento', async () => {
  const app = mount();
  await tick();
  const pending = deferred();
  app.authService.login = () => pending.promise;
  const login = assert.rejects(app.state().login('', ''), /Sessão alterada/);
  await app.state().logout();
  pending.resolve(response());
  await login;
  assert.equal(app.state().user, null);
  assert.equal(app.stored(), null);
  assert.equal(app.token(), null);
  app.unmount();
});

test('troca de conta rejeita resposta tardia da tentativa anterior', async () => {
  const app = mount();
  await tick();
  const first = deferred();
  app.authService.login = () => first.promise;
  const oldLogin = assert.rejects(app.state().login('', ''), /Sessão alterada/);
  app.authService.login = async () => response('conta-b', true);
  await app.state().login('', '');
  first.resolve(response('conta-a', false));
  await oldLogin;
  assert.equal(app.state().user.id, 'conta-b');
  assert.equal(app.state().needsOnboarding, false);
  assert.equal(app.stored(), response('conta-b').token);
  app.unmount();
});

test('logout durante gravação aguarda o SecureStore e remove a sessão gravada', async () => {
  const app = mount();
  await tick();
  const writing = deferred();
  const originalSave = app.secureStore.setItemAsync;
  app.secureStore.setItemAsync = async (key, value) => { await writing.promise; await originalSave(key, value); };
  const login = assert.rejects(app.state().login('', ''), /Sessão alterada/);
  await tick();
  const logout = app.state().logout();
  writing.resolve();
  await Promise.all([login, logout]);
  assert.equal(app.state().user, null);
  assert.equal(app.stored(), null);
  assert.equal(app.token(), null);
  app.unmount();
});

test('perfil e conclusão tardios não reabrem uma conta após logout', async () => {
  const app = mount();
  await tick();
  await app.state().login('', '');
  const pendingProfile = deferred();
  app.communityService.profile = () => pendingProfile.promise;
  const retry = app.state().retryAccount();
  await app.state().logout();
  pendingProfile.resolve(profile('conta-a', true));
  await retry;
  assert.equal(app.state().user, null);
  assert.equal(app.state().restoring, false);
  await app.state().login('', '');
  const pendingCompletion = deferred();
  app.authService.completeOnboarding = () => pendingCompletion.promise;
  const finish = assert.rejects(app.state().finishOnboarding([]), /Sessão alterada/);
  await app.state().logout();
  pendingCompletion.resolve(profile('conta-a', true));
  await finish;
  assert.equal(app.state().user, null);
  assert.equal(app.state().needsOnboarding, null);
  app.unmount();
});

test('flag ausente permanece desconhecida; falha ao salvar token não abre sessão', async () => {
  const app = mount();
  await tick();
  app.authService.register = async () => response('conta-a', null);
  await app.state().register({ nome: '', email: '', cpf: '', senha: '' });
  assert.equal(app.state().needsOnboarding, null);
  await app.state().logout();
  app.secureStore.setItemAsync = async () => { throw new Error('SecureStore indisponível no teste'); };
  await assert.rejects(app.state().login('', ''), /SecureStore indisponível/);
  assert.equal(app.state().user, null);
  assert.equal(app.stored(), null);
  assert.equal(app.token(), null);
  app.unmount();
});
