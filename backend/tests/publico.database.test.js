const { test } = require("node:test");
const assert = require("node:assert/strict");

test("visitante HTTP lê conteúdo e metadados reais do PostgreSQL sem registrar ações", {
  skip: process.env.RUN_DATABASE_TESTS !== "true"
}, async () => {
  require("dotenv").config({ quiet: true });
  assert.equal(process.env.NODE_ENV, "development");
  const prisma = require("../src/config/prisma");
  const { Client } = require("pg");
  const pg = new Client({ connectionString: process.env.DATABASE_URL });
  const app = require("../server");
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const origem = `http://127.0.0.1:${server.address().port}`;
  async function get(rota) {
    const r = await fetch(`${origem}${rota}`);
    assert.equal(r.status, 200);
    return r.json();
  }
  try {
    await pg.connect();
    await pg.query("BEGIN READ ONLY");
    const contagens = await pg.query("SELECT (SELECT COUNT(*)::integer FROM conteudo) AS conteudos, (SELECT COUNT(*)::integer FROM forum) AS foruns, (SELECT COUNT(*)::integer FROM conteudo_pro) AS pro, (SELECT COUNT(*)::integer FROM usuaria_conteudo) AS acessos");
    const antes = contagens.rows[0];
    const conteudos = await get("/api/publico/conteudos");
    assert.equal(conteudos.length, Math.min(antes.conteudos, 100));
    for (const item of conteudos) {
      assert.equal(item.material, undefined);
      assert.equal(item.id_mod, undefined);
    }
    if (conteudos.length) {
      const detalhe = await get(`/api/publico/conteudos/${conteudos[0].id}`);
      const salvo = await pg.query("SELECT mat_text_content FROM conteudo WHERE id_cont = $1", [conteudos[0].id]);
      assert.ok(detalhe.material === salvo.rows[0].mat_text_content, "Material público deve vir do PostgreSQL.");
    }
    const foruns = await get("/api/publico/foruns");
    assert.equal(foruns.length, Math.min(antes.foruns, 100));
    for (const forum of foruns) {
      assert.equal(forum.criadora, undefined);
      assert.equal(forum.postagem, undefined);
      assert.equal(forum.usuaria_forum, undefined);
    }
    const pro = await get("/api/publico/pro");
    assert.equal(pro.catalogo.length, Math.min(antes.pro, 100));
    assert.equal(pro.assinatura, null);
    for (const conteudo of pro.catalogo) {
      assert.equal(conteudo.material, undefined);
      assert.equal(conteudo.anexos, undefined);
    }
    await pg.query("ROLLBACK");
    const depois = await pg.query("SELECT COUNT(*)::integer AS acessos FROM usuaria_conteudo");
    assert.equal(depois.rows[0].acessos, antes.acessos);
  } finally {
    await pg.end();
    await new Promise((resolve) => server.close(resolve));
    await prisma.$disconnect();
  }
});
