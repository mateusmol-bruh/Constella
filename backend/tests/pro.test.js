const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const jwt = require("jsonwebtoken");

// Nenhuma conexão SQL ou escrita em banco. O Prisma real não é carregado.
let registro = null;
let falharConsulta = false;
const consultas = { assinatura: 0, catalogo: 0, material: 0, escritas: 0 };
const prismaPath = require.resolve("../src/config/prisma");
require.cache[prismaPath] = { id: prismaPath, filename: prismaPath, loaded: true, exports: {
  assinatura: {
    async findUnique() {
      consultas.assinatura++;
      if (falharConsulta) throw new Error("Banco indisponível no teste");
      return registro;
    },
    async create() { consultas.escritas++; throw new Error("Escrita proibida no teste"); },
    async delete() { consultas.escritas++; throw new Error("Escrita proibida no teste"); }
  },
  usuaria: { async findUnique({where}) { return {id_usr:where.id_usr}; } },
  conteudo_pro: {
    async findMany(query) {
      if (query.select) consultas.catalogo++; else consultas.material++;
      assert.equal(query.select?.mat_text_cont_pro, undefined);
      assert.equal(query.select?.anexos_cont_pro, undefined);
      return [{ id_cont_pro: 1n, titulo_cont_pro: "Título de teste", desc_cont_pro: "Descrição de teste", duracao_cont_pro: 5n, data_pub_cont_pro: new Date("2026-01-01T00:00:00Z"), mat_text_cont_pro: "material-exclusivo-de-teste", anexos_cont_pro: 1 }];
    },
    async findUnique() { consultas.material++; return null; }
  }
} };

const originalSecret = process.env.JWT_SECRET;
process.env.JWT_SECRET = "chave-apenas-para-testes-locais-pro";
const token = jwt.sign({ tipo: "usuaria" }, process.env.JWT_SECRET, { subject: "1", issuer: "constella", audience: "constella-app", expiresIn: "1m" });
const app = express();
app.use(express.json());
app.use("/api/pro", require("../src/routes/pro.routes"));
app.use("/api/assinatura", require("../src/routes/assinatura.routes"));
app.use(require('../src/middlewares/error.middleware'));
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
  if (originalSecret === undefined) delete process.env.JWT_SECRET;
  else process.env.JWT_SECRET = originalSecret;
  delete require.cache[prismaPath];
});
beforeEach(() => {
  registro = null;
  falharConsulta = false;
  Object.keys(consultas).forEach(key => { consultas[key] = 0; });
});
async function request(path, options = {}) {
  const response = await fetch(baseUrl + path, { ...options, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...options.headers } });
  return { status: response.status, data: await response.json() };
}

test("Pro e assinaturas exigem autenticação, sem consultar o banco", async () => {
  for (const path of ["/api/pro", "/api/pro/catalogo", "/api/pro/conteudos/1", "/api/assinatura"]) {
    const result = await request(path, { headers: { Authorization: "" } });
    assert.equal(result.status, 401);
  }
  assert.equal(consultas.assinatura, 0);
  assert.equal(consultas.material, 0);
});

test("conta gratuita recebe status inativo sem preço inventado", async () => {
  const { status, data } = await request("/api/pro");
  assert.equal(status, 200);
  assert.equal(data.status, "inativa");
  assert.equal(data.ativo, false);
  assert.equal(data.pro, false);
  assert.equal(data.plano, null);
  assert.equal(data.provedor_disponivel, false);
});

test("registro legado não comprova pagamento nem expiração", async () => {
  registro = { id_ass: 2n, forma_pagto: "legado", valor: 10 };
  const pro = await request("/api/pro");
  const assinatura = await request("/api/assinatura");
  assert.deepEqual(pro.data, assinatura.data);
  assert.equal(pro.data.status, "pendente_validacao");
  assert.equal(pro.data.registro_legado, true);
  assert.equal(pro.data.ativo, false);
  assert.equal(pro.data.assinatura, null);
});

test("POST com valor e pagamento forjados retorna 503 sem criar assinatura", async () => {
  const result = await request("/api/assinatura", { method: "POST", body: JSON.stringify({ valor: 0, forma_pagamento: "cliente", pago: true, ativo: true, status: "ativa" }) });
  assert.equal(result.status, 503);
  assert.match(result.data.mensagem, /Nenhuma cobrança/);
  assert.equal(consultas.escritas, 0);
  assert.equal(consultas.assinatura, 0);
});

test("DELETE não finge cancelamento nem remove registro legado", async () => {
  registro = { id_ass: 2n };
  const result = await request("/api/assinatura", { method: "DELETE" });
  assert.equal(result.status, 503);
  assert.equal(consultas.escritas, 0);
  assert.deepEqual(registro, { id_ass: 2n });
});

test("catálogo autenticado contém metadados, sem material ou anexos", async () => {
  const { status, data } = await request("/api/pro/catalogo");
  assert.equal(status, 200);
  assert.equal(data.conteudos[0].id, "1");
  assert.equal(data.conteudos[0].duracao, "5");
  assert.equal(data.conteudos[0].material, undefined);
  assert.equal(data.conteudos[0].anexos, undefined);
  assert.equal(JSON.stringify(data).includes("material-exclusivo-de-teste"), false);
  assert.equal(consultas.catalogo, 1);
  assert.equal(consultas.material, 0);
});

test("gratuita e registro legado recebem 403 em lista e material exclusivos", async () => {
  for (const legado of [null, { id_ass: 2n }]) {
    registro = legado;
    for (const path of ["/api/pro/conteudos", "/api/pro/conteudos/1?ativo=true"]) {
      const result = await request(path);
      assert.equal(result.status, 403);
      assert.equal(result.data.codigo, "PRO_NAO_VALIDADO");
    }
  }
  assert.equal(consultas.material, 0);
});

test("falha na verificação nega acesso sem carregar o material", async () => {
  falharConsulta = true;
  const result = await request("/api/pro/conteudos/1");
  assert.equal(result.status, 503);
  assert.equal(consultas.material, 0);
});

test('demonstração só libera catálogo exclusivo para a conta que ativou, sem assinatura ou cobrança', async () => {
  const oldNode=process.env.NODE_ENV, oldDemo=process.env.CONSTELLA_PRO_DEMO;
  process.env.NODE_ENV='development'; process.env.CONSTELLA_PRO_DEMO='true';
  try {
    assert.equal((await request('/api/pro/demonstracao',{method:'POST',body:JSON.stringify({ativar:'true'})})).status,400);
    const activated=await request('/api/pro/demonstracao',{method:'POST',body:JSON.stringify({ativar:true,id_usr:'2',valor:0})});
    assert.equal(activated.status,200); assert.equal(activated.data.demonstracao,true); assert.equal(activated.data.assinatura,null);
    const content=await request('/api/pro/conteudos');
    assert.equal(content.status,200); assert.equal(content.data.conteudos[0].material,'material-exclusivo-de-teste');
    const other=jwt.sign({tipo:'usuaria'},process.env.JWT_SECRET,{subject:'2',issuer:'constella',audience:'constella-app',expiresIn:'1m'});
    assert.equal((await request('/api/pro/conteudos',{headers:{Authorization:`Bearer ${other}`}})).status,403);
    assert.equal(consultas.escritas,0);
    await request('/api/pro/demonstracao',{method:'POST',body:JSON.stringify({ativar:false})});
    assert.equal((await request('/api/pro/conteudos')).status,403);
  } finally {
    if(oldNode===undefined)delete process.env.NODE_ENV;else process.env.NODE_ENV=oldNode;
    if(oldDemo===undefined)delete process.env.CONSTELLA_PRO_DEMO;else process.env.CONSTELLA_PRO_DEMO=oldDemo;
  }
});
test('produção recusa demonstração mesmo com variável habilitada e payload forjado',async()=>{
  const oldNode=process.env.NODE_ENV, oldDemo=process.env.CONSTELLA_PRO_DEMO;
  process.env.NODE_ENV='production'; process.env.CONSTELLA_PRO_DEMO='true';
  try { assert.equal((await request('/api/pro/demonstracao',{method:'POST',body:JSON.stringify({ativar:true})})).status,403); }
  finally {
    if(oldNode===undefined)delete process.env.NODE_ENV;else process.env.NODE_ENV=oldNode;
    if(oldDemo===undefined)delete process.env.CONSTELLA_PRO_DEMO;else process.env.CONSTELLA_PRO_DEMO=oldDemo;
  }
});
