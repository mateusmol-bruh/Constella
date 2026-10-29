const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { randomBytes } = require("node:crypto");
process.env.JWT_SECRET = randomBytes(32).toString("hex");
let consultaFalha = false;
const selects = {};
const prisma = {
  conteudo: {
    async findMany(query) {
      selects.conteudo = query;
      if (consultaFalha) throw new Error("NÃO EXPOR ESTE ERRO INTERNO");
      return [{ id_cont: 1n, titulo_cont: "Conteúdo", desc_cont: null, duracao_cont: 5,
        data_pub: new Date("2026-01-01"), mat_text_content: "Normal público",
        id_mod: 999n, moderadora: { email_mod: "privado@example.invalid" }, conteudo_interesses: [] }];
    },
    async findUnique(query) {
      selects.detalhe = query;
      return query.where.id_cont === 1n ? (await prisma.conteudo.findMany({}))[0] : null;
    }
  },
  forum: {
    async findMany(query) {
      selects.forum = query;
      return [{ id_for: 2n, titulo_for: "Fórum", desc_for: null, capa_for: null, dt_criacao: null,
        id_usr_criadora: 999n, id_mod: 888n, usuaria: { email_usr: "privado@example.invalid" },
        postagem: [{ cont_post: "Conversa privada" }], _count: { usuaria_forum: 3, postagem: 7 } }];
    }
  },
  conteudo_pro: {
    async findMany(query) {
      selects.pro = query;
      return [{ id_cont_pro: 3n, titulo_cont_pro: "Exclusivo", desc_cont_pro: null,
        duracao_cont_pro: 20n, data_pub_cont_pro: new Date("2026-01-01"),
        mat_text_cont_pro: "MATERIAL RESTRITO", anexos_cont_pro: 2 }];
    }
  },
  assinatura: { async findUnique() { throw new Error("Visitante não pode consultar assinatura de conta."); } }
};
require.cache[require.resolve("../src/config/prisma")] = { exports: prisma };
const app = require("../server");
let server;
let origem;
async function consultar(rota, method = "GET") {
  const r = await fetch(`${origem}${rota}`, { method });
  return { status: r.status, dados: await r.json() };
}
before(async () => {
  server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  origem = `http://127.0.0.1:${server.address().port}`;
});
after(async () => { await new Promise((resolve) => server.close(resolve)); });

test("visitante consulta somente metadados do catálogo normal e material do detalhe", async () => {
  const lista = await consultar("/api/publico/conteudos");
  assert.equal(lista.status, 200);
  assert.deepEqual(Object.keys(lista.dados[0]).sort(), ["id", "titulo", "descricao", "duracao", "data_publicacao", "interesses"].sort());
  assert.equal(selects.conteudo.take, 100);
  assert.equal(selects.conteudo.select.mat_text_content, undefined);
  assert.equal(selects.conteudo.select.id_mod, undefined);
  const detalhe = await consultar("/api/publico/conteudos/1");
  assert.equal(detalhe.status, 200);
  assert.equal(detalhe.dados.material, "Normal público");
  assert.equal(detalhe.dados.id_mod, undefined);
  assert.equal(detalhe.dados.moderadora, undefined);
});

test("lista pública de fóruns exclui autoras, participantes e postagens", async () => {
  const r = await consultar("/api/publico/foruns");
  assert.equal(r.status, 200);
  assert.deepEqual(Object.keys(r.dados[0]).sort(), ["id_for", "titulo", "descricao", "capa", "dt_criacao", "quantidade_membros", "quantidade_postagens"].sort());
  assert.equal(selects.forum.take, 100);
  assert.equal(selects.forum.select.usuaria, undefined);
  assert.equal(selects.forum.select.postagem, undefined);
  assert.equal(selects.forum.select.id_usr_criadora, undefined);
});

test("apresentação pública Pro não consulta conta nem revela material e anexos", async () => {
  const r = await consultar("/api/publico/pro");
  assert.equal(r.status, 200);
  assert.equal(r.dados.autenticada, false);
  assert.equal(r.dados.assinatura, null);
  assert.equal(r.dados.provedor_disponivel, false);
  assert.deepEqual(r.dados.planos, []);
  assert.equal(r.dados.status, undefined);
  assert.equal(r.dados.catalogo[0].material, undefined);
  assert.equal(r.dados.catalogo[0].anexos, undefined);
  assert.equal(selects.pro.select.mat_text_cont_pro, undefined);
  assert.equal(selects.pro.select.anexos_cont_pro, undefined);
  assert.equal(selects.pro.take, 100);
});

test("IDs inválidos e inexistentes retornam400/404", async () => {
  for (const id of ["0", "-1", "x", "9223372036854775808"]) {
    assert.equal((await consultar(`/api/publico/conteudos/${id}`)).status, 400);
  }
  assert.equal((await consultar("/api/publico/conteudos/999")).status, 404);
});

test("nenhuma operação pessoal fica disponível sem JWT", async () => {
  for (const [method, rota] of [
    ["GET", "/api/perfil"], ["PUT", "/api/perfil"], ["PUT", "/api/perfil/onboarding"],
    ["PUT", "/api/interesses/meus"], ["GET", "/api/chats"], ["POST", "/api/chats"],
    ["POST", "/api/foruns"], ["POST", "/api/conexoes"], ["GET", "/api/assinatura"],
    ["POST", "/api/assinatura"], ["GET", "/api/pro/conteudos"], ["GET", "/api/conteudos"]
  ]) assert.equal((await consultar(rota, method)).status, 401, `${method} ${rota}`);
});

test("prefixo público não possui escritas, posts, membros ou materiais Pro", async () => {
  for (const [method, rota] of [
    ["POST", "/api/publico/foruns"], ["POST", "/api/publico/conteudos"],
    ["GET", "/api/publico/foruns/2/postagens"], ["GET", "/api/publico/foruns/2/membros"],
    ["GET", "/api/publico/pro/conteudos/3"], ["POST", "/api/publico/assinatura"]
  ]) assert.equal((await consultar(rota, method)).status, 404);
});

test("falha no banco retorna erro e nunca substitui resposta por dados demonstrativos", async () => {
  consultaFalha = true;
  try {
    const r = await consultar("/api/publico/conteudos");
    assert.equal(r.status, 500);
    assert.deepEqual(r.dados, { mensagem: "Erro interno do servidor." });
  } finally { consultaFalha = false; }
});
