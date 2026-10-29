const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const jwt = require("jsonwebtoken");

// Exercita os controllers e services reais por HTTP. Nunca carrega o Prisma real.
let consultas = 0;
const leitura = {
  async findUnique() { consultas++; return null; },
  async findFirst() { consultas++; return null; }
};
const prismaPath = require.resolve("../src/config/prisma");
require.cache[prismaPath] = {
  id: prismaPath, filename: prismaPath, loaded: true,
  exports: {
    forum: leitura, postagem: leitura, chat: leitura, mensagem: leitura,
    usuaria: leitura, conteudo: leitura, conteudo_pro: leitura, assinatura: leitura
  }
};
const originalSecret = process.env.JWT_SECRET;
process.env.JWT_SECRET = "chave-exclusiva-dos-testes-de-limites";
const token = jwt.sign({ tipo: "usuaria" }, process.env.JWT_SECRET, {
  subject: "1", issuer: "constella", audience: "constella-app", expiresIn: "1m"
});
const app = express();
app.use(express.json());
for (const [prefix, route] of [
  ["foruns", "forum"], ["postagens", "postagem"], ["chats", "chat"],
  ["denuncias", "denuncia"], ["usuarios", "usuario"], ["conteudos", "conteudo"]
]) app.use(`/api/${prefix}`, require(`../src/routes/${route}.routes`));

const assinatura = require("../src/services/assinatura.service");
const pro = require("../src/services/pro.service");
const MAX_ID = "9223372036854775807";
const invalidos = ["0", "-1", "9223372036854775808", "10000000000000000000", "9".repeat(300)];
const endpoints = [
  ["GET", id => `/api/foruns/${id}`],
  ["GET", id => `/api/foruns/${id}/postagens`],
  ["GET", id => `/api/chats/${id}`],
  ["GET", id => `/api/chats/${id}/mensagens`],
  ["DELETE", id => `/api/postagens/${id}`],
  ["POST", id => `/api/denuncias/postagens/${id}`],
  ["POST", id => `/api/denuncias/mensagens/${id}`],
  ["GET", id => `/api/usuarios/${id}`],
  ["GET", id => `/api/conteudos/${id}`]
];
let server;
let baseUrl;
before(async () => {
  server = await new Promise(resolve => {
    const instance = app.listen(0, "127.0.0.1", () => resolve(instance));
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  await new Promise(resolve => server.close(resolve));
  delete require.cache[prismaPath];
  if (originalSecret === undefined) delete process.env.JWT_SECRET;
  else process.env.JWT_SECRET = originalSecret;
});
async function request(method, endpoint) {
  const response = await fetch(baseUrl + endpoint, {
    method,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    ...(method === "POST" ? { body: JSON.stringify({ motivo: "Motivo de teste" }) } : {})
  });
  return { status: response.status, body: await response.json() };
}

test("IDs fora do BIGINT PostgreSQL retornam 400 por HTTP antes de consultar o banco", async () => {
  const antes = consultas;
  for (const id of invalidos) {
    for (const [method, endpoint] of endpoints) {
      const result = await request(method, endpoint(id));
      assert.equal(result.status, 400, `${method} ${endpoint(id)} deve rejeitar o ID`);
      assert.equal(typeof result.body.mensagem, "string");
    }
  }
  assert.equal(consultas, antes, "IDs inválidos não podem alcançar o Prisma");
});

test("os limites inclusivos 1 e BIGINT máximo chegam à consulta por HTTP", async () => {
  for (const id of ["1", MAX_ID]) {
    for (const [method, endpoint] of endpoints) {
      // /usuarios/1 é o próprio perfil: o contrato orienta usar /perfil.
      if (id === "1" && endpoint(id) === "/api/usuarios/1") continue;
      const antes = consultas;
      const result = await request(method, endpoint(id));
      assert.equal(result.status, 404, "O mock sem registros deve produzir recurso ausente");
      assert.equal(consultas, antes + 1, "O limite válido deve alcançar o Prisma");
    }
  }
});

test("services de Pro e assinatura rejeitam IDs fora do intervalo sem consultar o banco", async () => {
  const antes = consultas;
  for (const id of invalidos) {
    await assert.rejects(pro.buscarConteudoPro(id), error => error.statusCode === 400);
    await assert.rejects(assinatura.buscarStatusAssinatura(id), error => error.statusCode === 400);
    await assert.rejects(assinatura.criarAssinatura(id), error => error.statusCode === 400);
    await assert.rejects(assinatura.cancelarAssinatura(id), error => error.statusCode === 400);
  }
  assert.equal(consultas, antes);
});

test("limites válidos de Pro e assinatura preservam a restrição de acesso", async () => {
  for (const id of ["1", MAX_ID]) {
    await assert.rejects(pro.buscarConteudoPro(id), error => error.statusCode === 404);
    const status = await assinatura.buscarStatusAssinatura(id);
    assert.equal(status.ativo, false);
    await assert.rejects(assinatura.criarAssinatura(id), error => error.statusCode === 503);
    await assert.rejects(assinatura.cancelarAssinatura(id), error => error.statusCode === 503);
  }
});
