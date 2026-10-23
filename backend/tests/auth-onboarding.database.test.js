const { test } = require("node:test");
const assert = require("node:assert/strict");
const { randomBytes, randomInt } = require("node:crypto");

// Opt-in: cria apenas contas identificadas como TESTE num banco de desenvolvimento.
// Não apaga ou modifica registros anteriores; a execução padrão não usa o banco.
test("HTTP + PostgreSQL: cadastro, onboarding vazio, novo login e isolamento entre contas", {
  skip: process.env.RUN_DATABASE_TESTS !== "true"
}, async () => {
  require("dotenv").config({ quiet: true });
  assert.equal(process.env.NODE_ENV, "development", "Teste exige banco de desenvolvimento confirmado.");
  const prisma = require("../src/config/prisma");
  const app = require("../server");
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const origem = `http://127.0.0.1:${server.address().port}`;
  const senha = randomBytes(24).toString("base64url");
  const email = `teste-integracao-${randomBytes(10).toString("hex")}@example.invalid`;
  const email2 = `teste-integracao-${randomBytes(10).toString("hex")}@example.invalid`;
  // CPF sintético com dígitos verificadores, gerado só para conta TESTE; nunca é logado.
  function cpfSintetico() {
    const n = Array.from({ length: 9 }, () => randomInt(10));
    for (const tamanho of [9, 10]) {
      const soma = n.reduce((s, d, i) => s + d * (tamanho + 1 - i), 0);
      const resto = (soma * 10) % 11;
      n.push(resto === 10 ? 0 : resto);
    }
    return n.join("");
  }
  async function api(path, method, body, token) {
    const r = await fetch(`${origem}${path}`, {
      method, headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) })
    });
    return { status: r.status, body: await r.json() };
  }
  try {
    const cadastro = await api("/api/auth/cadastro", "POST", { nome: "TESTE integração onboarding", email, senha, cpf: cpfSintetico() });
    assert.equal(cadastro.status, 201, "Cadastro HTTP deve concluir.");
    assert.equal(cadastro.body.usuaria.onboarding_concluido, false);
    assert.equal(cadastro.body.usuaria.apresentacao, null);
    assert.equal(cadastro.body.usuaria.senha_usr, undefined);
    const jwt = cadastro.body.token;
    const catalogo = await api("/api/interesses", "GET", undefined, jwt);
    assert.equal(catalogo.status, 200);
    const finalizado = await api("/api/perfil/onboarding", "PUT", { apresentacao: "", interesses: [] }, jwt);
    assert.equal(finalizado.status, 200);
    assert.equal(finalizado.body.perfil.onboarding_concluido, true);
    assert.deepEqual(finalizado.body.perfil.interesses, []);
    const relogin = await api("/api/auth/login", "POST", { email, senha });
    assert.equal(relogin.status, 200);
    assert.equal(relogin.body.usuaria.onboarding_concluido, true);
    const restaurado = await api("/api/perfil", "GET", undefined, relogin.body.token);
    assert.equal(restaurado.body.onboarding_concluido, true);
    assert.equal(restaurado.body.apresentacao, "");
    assert.deepEqual(restaurado.body.interesses, []);
    assert.equal(restaurado.body.cpf_usr, undefined);

    const segunda = await api("/api/auth/cadastro", "POST", { nome: "TESTE isolamento onboarding", email: email2, senha, cpf: cpfSintetico() });
    assert.equal(segunda.status, 201);
    assert.equal(segunda.body.usuaria.onboarding_concluido, false);
    const antes = await api("/api/perfil", "GET", undefined, segunda.body.token);
    const invalido = await api("/api/perfil/onboarding", "PUT", { apresentacao: "Não persistir", interesses: ["9223372036854775807"] }, segunda.body.token);
    assert.equal(invalido.status, 400);
    const depois = await api("/api/perfil", "GET", undefined, segunda.body.token);
    assert.equal(depois.body.onboarding_concluido, antes.body.onboarding_concluido);
    assert.equal(depois.body.apresentacao, antes.body.apresentacao);
    assert.deepEqual(depois.body.interesses, antes.body.interesses);
    const editado = await api("/api/perfil", "PUT", { apresentacao: "Apresentação de teste", id_usr: cadastro.body.usuaria.id }, segunda.body.token);
    assert.equal(editado.status, 200);
    assert.equal(editado.body.perfil.id_usr, segunda.body.usuaria.id);
    const primeiraPreservada = await api("/api/perfil", "GET", undefined, relogin.body.token);
    assert.equal(primeiraPreservada.body.apresentacao, "");
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await prisma.$disconnect();
  }
});
