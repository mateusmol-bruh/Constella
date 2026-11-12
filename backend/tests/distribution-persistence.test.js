const { test } = require("node:test");
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const path = require("node:path");
const { randomBytes, randomInt } = require("node:crypto");

test("cadastro HTTP persiste no PostgreSQL após reiniciar processo, novo login e recusa de duplicado", {
  skip: process.env.RUN_DATABASE_TESTS !== "true", timeout: 90000
}, async () => {
  const backend = path.resolve(__dirname, "..");
  require("dotenv").config({ path: path.join(backend, ".env"), quiet: true });
  assert.equal(process.env.NODE_ENV, "development", "Teste restrito a desenvolvimento confirmado.");
  const prisma = require("../src/config/prisma");
  const { Client } = require("pg");
  const bcrypt = require("bcryptjs");
  const email = `teste-persistencia-${randomBytes(12).toString("hex")}@example.invalid`;
  const senha = randomBytes(24).toString("base64url");
  const digitos = Array.from({ length: 9 }, () => randomInt(10));
  for (const tamanho of [9, 10]) {
    const resto = (digitos.reduce((s, d, i) => s + d * (tamanho + 1 - i), 0) * 10) % 11;
    digitos.push(resto === 10 ? 0 : resto);
  }
  const payload = { nome: "TESTE persistência após reinício", email, senha, cpf: digitos.join("") };
  const children = [];
  let pg;
  async function iniciarBackend() {
    const code = `
      const app = require('./server');
      const prisma = require('./src/config/prisma');
      const server = app.listen(0, '127.0.0.1', () => process.send({port:server.address().port}));
      process.on('message', async msg => {
        if(msg === 'stop') server.close(async () => { await prisma.$disconnect(); process.exit(0); });
      });
    `;
    const child = spawn(process.execPath, ["-e", code], {
      cwd: backend, env: { ...process.env }, stdio: ["ignore", "ignore", "ignore", "ipc"]
    });
    children.push(child);
    const port = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("Backend não iniciou em 20 segundos.")), 20000);
      child.once("message", (message) => { clearTimeout(timer); resolve(message.port); });
      child.once("error", () => { clearTimeout(timer); reject(new Error("Falha ao iniciar processo do backend.")); });
      child.once("exit", () => { clearTimeout(timer); reject(new Error("Processo do backend encerrou antes de disponibilizar HTTP.")); });
    });
    return { child, origem: `http://127.0.0.1:${port}` };
  }
  async function encerrar(child) {
    if (child.exitCode !== null || child.signalCode !== null) return;
    const closed = new Promise((resolve) => child.once("exit", resolve));
    child.send("stop");
    const timer = setTimeout(() => child.kill(), 10000);
    await closed;
    clearTimeout(timer);
    assert.equal(child.exitCode, 0, "Backend deve encerrar normalmente antes do reinício.");
  }
  async function api(origem, rota, metodo, dados, token) {
    const response = await fetch(`${origem}${rota}`, {
      method: metodo,
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      ...(dados === undefined ? {} : { body: JSON.stringify(dados) })
    });
    return { status: response.status, dados: await response.json() };
  }
  try {
    const primeira = await iniciarBackend();
    const cadastro = await api(primeira.origem, "/api/auth/cadastro", "POST", payload);
    assert.equal(cadastro.status, 201, "Cadastro real deve receber201.");
    assert.equal(typeof cadastro.dados.token, "string");
    assert.equal(cadastro.dados.usuaria.onboarding_concluido, false);
    const id = cadastro.dados.usuaria.id;
    const registro = await prisma.usuaria.findUnique({
      where: { email_usr: email }, select: { id_usr: true, senha_usr: true }
    });
    assert.ok(registro && String(registro.id_usr) === id, "Prisma deve consultar o registro criado viaHTTP.");
    assert.ok(registro.senha_usr !== senha && await bcrypt.compare(senha, registro.senha_usr), "Banco deve guardar hash bcrypt válido.");
    pg = new Client({ connectionString: process.env.DATABASE_URL });
    await pg.connect();
    const consulta = await pg.query("SELECT id_usr::text, onboarding_concluido FROM public.usuaria WHERE email_usr = $1", [email]);
    assert.equal(consulta.rowCount, 1, "ConsultaSQL independente deve encontrar a conta.");
    assert.ok(consulta.rows[0].id_usr === id, "HTTP, Prisma eSQL devem identificar o mesmo registro.");
    const concluido = await api(primeira.origem, "/api/perfil/onboarding", "PUT", { apresentacao: "", interesses: [] }, cadastro.dados.token);
    assert.equal(concluido.status, 200);
    await pg.end(); pg = null;
    await prisma.$disconnect();
    await encerrar(primeira.child);

    const segunda = await iniciarBackend();
    pg = new Client({ connectionString: process.env.DATABASE_URL });
    await pg.connect();
    const aposReinicio = await pg.query("SELECT id_usr::text, onboarding_concluido, apresentacao FROM public.usuaria WHERE email_usr = $1", [email]);
    assert.equal(aposReinicio.rowCount, 1);
    assert.ok(aposReinicio.rows[0].id_usr === id);
    assert.equal(aposReinicio.rows[0].onboarding_concluido, true);
    assert.equal(aposReinicio.rows[0].apresentacao, "");
    const login = await api(segunda.origem, "/api/auth/login", "POST", { email, senha });
    assert.equal(login.status, 200);
    assert.ok(login.dados.usuaria.id === id);
    assert.equal(login.dados.usuaria.onboarding_concluido, true);
    const perfil = await api(segunda.origem, "/api/perfil", "GET", undefined, login.dados.token);
    assert.equal(perfil.status, 200);
    assert.ok(perfil.dados.id_usr === id);
    assert.deepEqual(perfil.dados.interesses, []);
    assert.equal(perfil.dados.onboarding_concluido, true);
    const duplicado = await api(segunda.origem, "/api/auth/cadastro", "POST", payload);
    assert.equal(duplicado.status, 409);
    const quantidade = await pg.query("SELECT COUNT(*)::integer AS quantidade FROM public.usuaria WHERE email_usr = $1", [email]);
    assert.equal(quantidade.rows[0].quantidade, 1);
  } finally {
    if (pg) await pg.end();
    await prisma.$disconnect();
    for (const child of children) await encerrar(child);
  }
});
