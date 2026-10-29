const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { randomBytes } = require("node:crypto");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

// O servidor HTTP é real; o banco é substituído antes de carregar as rotas.
process.env.JWT_SECRET = randomBytes(32).toString("hex");
const conta = {
  id_usr: 7n, nome_usr: "Conta de teste", email_usr: "teste@example.invalid",
  foto_usr: null, status_verificacao: false, onboarding_concluido: false,
  apresentacao: null, usuaria_interesses: []
};
let atualizacoes = [];
let transacoes = 0;
const prisma = {
  sessao: require("./helpers/sessoes")("7"),
  usuaria: {
    async findUnique({ where }) {
      if (where.email_usr && where.email_usr !== conta.email_usr) return null;
      if (where.id_usr && where.id_usr !== conta.id_usr) return null;
      return { ...conta };
    },
    async create({ data }) { return { ...conta, ...data }; },
    async update({ where, data }) {
      atualizacoes.push({ where, data });
      Object.assign(conta, data);
      return { ...conta };
    }
  },
  interesses: {
    async findMany({ where } = {}) {
      const catalogo = [{ id_intr: 1n, nome_intr: "Leitura" }];
      return where ? catalogo.filter((i) => where.id_intr.in.includes(i.id_intr)) : catalogo;
    }
  },
  usuaria_interesses: {
    async findMany() { return conta.usuaria_interesses; },
    async deleteMany() { conta.usuaria_interesses = []; return { count: 0 }; },
    async createMany({ data }) {
      conta.usuaria_interesses = data.map((i) => ({ interesses: { id_intr: i.id_intr, nome_intr: "Leitura" } }));
      return { count: data.length };
    }
  },
  async $transaction(callback) { transacoes += 1; return callback(prisma); }
};
require.cache[require.resolve("../src/config/prisma")] = { exports: prisma };
const app = require("../server");
let server;
let origem;
function token(payload = {}, options = {}) {
  return jwt.sign({ sub: "7", tipo: "usuaria", jti: "a".repeat(64), ...payload }, process.env.JWT_SECRET,
    { issuer: "constella", audience: "constella-app", expiresIn: "1h", ...options });
}
async function api(path, method = "GET", body, bearer = token()) {
  const response = await fetch(`${origem}${path}`, {
    method, headers: { "Content-Type": "application/json", ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  });
  return { status: response.status, body: await response.json() };
}
before(async () => {
  conta.senha_usr = await bcrypt.hash("senha-para-testes", 4);
  server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  origem = `http://127.0.0.1:${server.address().port}`;
});
after(async () => { await new Promise((resolve) => server.close(resolve)); });

test("rotas privadas rejeitam ausência, expiração, tipo e subject inválidos", async () => {
  assert.equal((await api("/api/perfil", "GET", undefined, null)).status, 401);
  assert.equal((await api("/api/perfil", "GET", undefined, token({}, { expiresIn: -1 }))).status, 401);
  assert.equal((await api("/api/perfil", "GET", undefined, token({ tipo: "moderadora" }))).status, 403);
  assert.equal((await api("/api/perfil", "GET", undefined, token({ sub: "-7" }))).status, 401);
  assert.equal((await api("/api/perfil", "GET", undefined, token({ sub: "9223372036854775808" }))).status, 401);
});

test("login retorna contrato de sessão sem CPF ou hash e rejeita senha errada", async () => {
  const login = await api("/api/auth/login", "POST", { email: " TESTE@example.invalid ", senha: "senha-para-testes" }, null);
  assert.equal(login.status, 200);
  assert.equal(login.body.usuaria.onboarding_concluido, false);
  assert.equal(login.body.usuaria.id, "7");
  assert.equal(login.body.usuaria.senha_usr, undefined);
  assert.equal(login.body.usuaria.cpf_usr, undefined);
  assert.equal(jwt.verify(login.body.token, process.env.JWT_SECRET).sub, "7");
  assert.equal((await api("/api/auth/login", "POST", { email: conta.email_usr, senha: "incorreta" }, null)).status, 401);
});

test("cadastro rejeita payload/CPF inválido sem escrever no banco", async () => {
  assert.equal((await api("/api/auth/cadastro", "POST", {}, null)).status, 400);
  assert.equal((await api("/api/auth/cadastro", "POST", {
    nome: "Teste", email: "teste@example.invalid", senha: "teste-1234567", cpf: "00000000000"
  }, null)).status, 400);
});

test("onboarding rejeita IDs malformados, repetidos e inexistentes antes de persistir flag", async () => {
  const inicial = atualizacoes.length;
  for (const interesses of [["x"], [1], ["1", "1"], ["9223372036854775808"], ["2"], Array(11).fill("1")]) {
    const r = await api("/api/perfil/onboarding", "PUT", { apresentacao: "", interesses });
    assert.equal(r.status, 400);
  }
  assert.equal(atualizacoes.length, inicial);
  assert.equal(conta.onboarding_concluido, false);
});

test("lista vazia conclui onboarding em transação para o ID do JWT", async () => {
  const r = await api("/api/perfil/onboarding", "PUT", {
    apresentacao: "", interesses: [], id_usr: "999", onboarding_concluido: false
  });
  assert.equal(r.status, 200);
  assert.equal(r.body.perfil.onboarding_concluido, true);
  assert.equal(r.body.perfil.apresentacao, "");
  assert.deepEqual(r.body.perfil.interesses, []);
  assert.equal(atualizacoes.at(-1).where.id_usr, 7n);
  assert.ok(transacoes > 0);
});

test("novo login e consulta de perfil preservam conclusão sem interesses", async () => {
  const login = await api("/api/auth/login", "POST", { email: conta.email_usr, senha: "senha-para-testes" }, null);
  assert.equal(login.status, 200);
  assert.equal(login.body.usuaria.onboarding_concluido, true);
  const perfil = await api("/api/perfil", "GET", undefined, login.body.token);
  assert.equal(perfil.body.onboarding_concluido, true);
  assert.deepEqual(perfil.body.interesses, []);
  assert.equal(perfil.body.cpf_usr, undefined);
  assert.equal(perfil.body.senha_usr, undefined);
});

test("edição de interesses mantém status e valida catálogo", async () => {
  assert.equal((await api("/api/interesses/meus", "PUT", { interesses: ["0"] })).status, 400);
  assert.equal((await api("/api/interesses/meus", "PUT", { interesses: [] })).status, 200);
  assert.equal(conta.onboarding_concluido, true);
});

test("apresentação valida limite e não aceita modificar flag pelo perfil", async () => {
  assert.equal((await api("/api/perfil", "PUT", { apresentacao: "x".repeat(501) })).status, 400);
  const r = await api("/api/perfil", "PUT", { apresentacao: " Nova apresentação ", onboarding_concluido: false });
  assert.equal(r.status, 200);
  assert.equal(r.body.perfil.apresentacao, "Nova apresentação");
  assert.equal(r.body.perfil.onboarding_concluido, true);
});

test("erros de formato JSON produzem400 sem stack ou credenciais", async () => {
  const r = await fetch(`${origem}/api/auth/login`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: "{"
  });
  assert.equal(r.status, 400);
  assert.deepEqual(await r.json(), { mensagem: "JSON inválido." });
});

test("estado ausente de migration é desconhecido e não inferido por interesses", () => {
  const { estadoOnboarding } = require("../src/utils/onboarding");
  assert.deepEqual(estadoOnboarding({ usuaria_interesses: [{ interesses: { id_intr: 1n } }] }), {
    onboarding_concluido: null, apresentacao: null
  });
});
