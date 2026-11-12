const { test } = require("node:test");
const assert = require("node:assert/strict");
const { randomBytes, randomInt } = require("node:crypto");

// Opt-in para banco de desenvolvimento. Cria somente contas/ações TESTE novas;
// mantém os registros identificáveis e nunca altera/apaga dados preexistentes.
// Tokens, CPFs sintéticos e senhas aleatórias ficam exclusivamente em memória.
test("HTTP + PostgreSQL: conexões, chat, fórum, denúncias, conteúdos e bloqueio Pro", {
  skip: process.env.CONSTELLA_INTEGRATION_TESTS !== "1",
}, async (t) => {
  require("dotenv").config({ quiet: true });
  assert.equal(process.env.NODE_ENV, "development", "A integração exige banco de desenvolvimento confirmado.");
  const prisma = require("../src/config/prisma");
  const app = require("../server");
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });
  const origin = `http://127.0.0.1:${server.address().port}`;
  const namespace = `teste-social-${randomBytes(10).toString("hex")}`;
  const accounts = [];
  let connectionId, chatId, messageId, forumId, postId;

  function syntheticCpf() {
    let digits;
    do { digits = Array.from({ length: 9 }, () => randomInt(10)); }
    while (new Set(digits).size === 1);
    for (const length of [9, 10]) {
      const sum = digits.reduce((total, digit, index) => total + digit * (length + 1 - index), 0);
      const remainder = (sum * 10) % 11;
      digits.push(remainder === 10 ? 0 : remainder);
    }
    return digits.join("");
  }

  async function request(path, method = "GET", account, body) {
    const response = await fetch(`${origin}${path}`, {
      method,
      headers: { "Content-Type": "application/json", ...(account ? { Authorization: `Bearer ${account.token}` } : {}) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: AbortSignal.timeout(15000),
    });
    return { status: response.status, body: await response.json() };
  }
  function expectStatus(result, status, name) {
    assert.equal(result.status, status, name);
    return result.body;
  }

  try {
    await t.test("três contas sintéticas autenticadas; rotas privadas exigem JWT", async () => {
      for (const label of ["A", "B", "C"]) {
        const body = expectStatus(await request("/api/auth/cadastro", "POST", undefined, {
          nome: `TESTE social ${label} ${namespace}`,
          email: `${namespace}-${label.toLowerCase()}@example.invalid`,
          senha: randomBytes(24).toString("base64url"),
          cpf: syntheticCpf(),
        }), 201, "Cadastro de conta TESTE");
        assert.equal(typeof body.token, "string");
        assert.equal(typeof body.usuaria.id, "string");
        accounts.push({ id: body.usuaria.id, token: body.token });
      }
      for (const path of ["/api/conexoes", "/api/chats", "/api/foruns", "/api/conteudos", "/api/pro/catalogo"]) {
        expectStatus(await request(path), 401, "JWT obrigatório");
      }
    });
    const [a, b, c] = accounts;
    assert.equal(accounts.length, 3, "As contas TESTE devem estar disponíveis.");

    await t.test("conexão pendente, autorização para aceitar e aceite real", async () => {
      expectStatus(await request("/api/chats", "POST", a, { id_destinataria: b.id }), 403, "Chat exige conexão aceita");
      const created = expectStatus(await request(`/api/conexoes/${b.id}`, "POST", a, { id_user_solicit: c.id }), 201, "Solicitação");
      connectionId = created.conexao.id_conexao;
      assert.equal(created.conexao.id_user_solicit, a.id, "JWT prevalece sobre remetente arbitrário");
      assert.equal(created.conexao.status_conexao, "PENDENTE");
      expectStatus(await request(`/api/conexoes/${b.id}`, "POST", a), 409, "Solicitação duplicada");
      const received = expectStatus(await request("/api/conexoes/recebidas", "GET", b), 200, "Recebidas");
      assert.equal(received.solicitacoes.some(item => item.id_conexao === connectionId), true);
      expectStatus(await request(`/api/conexoes/${connectionId}/aceitar`, "PATCH", c, { id_usr: b.id }), 403, "Terceira conta não aceita");
      const accepted = expectStatus(await request(`/api/conexoes/${connectionId}/aceitar`, "PATCH", b), 200, "Aceite pela destinatária");
      assert.equal(accepted.conexao.status_conexao, "ACEITO");
      const connections = expectStatus(await request("/api/conexoes", "GET", a), 200, "Conexões aceitas");
      assert.equal(connections.conexoes.some(item => item.id_conexao === connectionId), true);
    });

    await t.test("chat privado persiste mensagens e recusa acesso/identidade de terceiros", async () => {
      const created = expectStatus(await request("/api/chats", "POST", a, { id_destinataria: b.id }), 201, "Criação de chat");
      chatId = created.chat.id_chat;
      const existing = expectStatus(await request("/api/chats", "POST", b, { id_destinataria: a.id }), 200, "Reutilização de chat");
      assert.equal(existing.chat.id_chat, chatId);
      const content = `TESTE mensagem ${namespace}`;
      const sent = expectStatus(await request(`/api/chats/${chatId}/mensagens`, "POST", a, { conteudo: content, id_usr_emissor: c.id }), 201, "Envio de mensagem");
      messageId = sent.dados.id_msg;
      assert.equal(sent.dados.id_usr_emissor, a.id, "Emissor definido pelo JWT");
      const history = expectStatus(await request(`/api/chats/${chatId}/mensagens`, "GET", b), 200, "Histórico para participante");
      assert.equal(history.mensagens.some(item => item.id_msg === messageId && item.conteudo === content), true);
      expectStatus(await request(`/api/chats/${chatId}`, "GET", c), 403, "Chat privado");
      expectStatus(await request(`/api/chats/${chatId}/mensagens`, "GET", c), 403, "Histórico privado");
      expectStatus(await request(`/api/chats/${chatId}/mensagens`, "POST", c, { conteudo: "TESTE envio proibido", id_usr_emissor: a.id }), 403, "Envio privado");
      expectStatus(await request(`/api/chats/${chatId}/mensagens/${messageId}`, "DELETE", b), 403, "Exclusão somente pela autora");
      expectStatus(await request(`/api/chats/${chatId}/mensagens/${messageId}`, "DELETE", a), 200, "Exclusão própria de dado TESTE");
      const after = expectStatus(await request(`/api/chats/${chatId}/mensagens`, "GET", b), 200, "Histórico após exclusão");
      assert.equal(after.mensagens.some(item => item.id_msg === messageId), false);
    });

    await t.test("fórum lista, exige participação e persiste conversa com autoria pelo JWT", async () => {
      const created = expectStatus(await request("/api/foruns", "POST", a, {
        titulo: `TESTE fórum ${namespace}`, descricao: "Comunidade de teste de integração HTTP.", id_usr_criadora: c.id,
      }), 201, "Criação de fórum com moderadora do seed");
      forumId = created.forum.id_for;
      const listed = expectStatus(await request("/api/foruns", "GET", b), 200, "Listagem de fóruns");
      assert.equal(listed.foruns.some(item => item.id_for === forumId && item.criadora.id === a.id && item.participando === false), true);
      expectStatus(await request(`/api/foruns/${forumId}/postagens`, "GET", b), 403, "Sem participação não lê");
      expectStatus(await request(`/api/foruns/${forumId}/postagens`, "POST", b, { conteudo: "TESTE envio proibido" }), 403, "Sem participação não envia");
      expectStatus(await request(`/api/foruns/${forumId}/entrar`, "POST", b), 201, "Entrada no fórum");
      expectStatus(await request(`/api/foruns/${forumId}/entrar`, "POST", b), 409, "Entrada duplicada");
      const sent = expectStatus(await request(`/api/foruns/${forumId}/postagens`, "POST", a, { conteudo: `TESTE postagem ${namespace}`, id_usr: c.id }), 201, "Postagem da criadora");
      postId = sent.postagem.id_post;
      assert.equal(sent.postagem.autora.id, a.id, "Autora definida pelo JWT");
      const reply = expectStatus(await request(`/api/foruns/${forumId}/postagens`, "POST", b, { conteudo: "TESTE resposta de participante" }), 201, "Resposta no fórum");
      assert.equal(reply.postagem.autora.id, b.id);
      const history = expectStatus(await request(`/api/foruns/${forumId}/postagens`, "GET", b), 200, "Histórico do fórum");
      assert.equal(history.postagens.some(item => item.id_post === postId), true);
      assert.equal(history.postagens.some(item => item.id_post === reply.postagem.id_post), true);
      expectStatus(await request(`/api/foruns/${forumId}/postagens`, "GET", c), 403, "Terceira conta não lê");
      expectStatus(await request(`/api/foruns/${forumId}`, "PUT", c, { titulo: "TESTE alteração proibida" }), 403, "Somente criadora edita fórum");
      expectStatus(await request(`/api/postagens/${postId}`, "DELETE", b), 403, "Somente autora exclui postagem");
      expectStatus(await request(`/api/postagens/${reply.postagem.id_post}`, "DELETE", b), 200, "Exclusão de postagem própria TESTE");
    });

    await t.test("denúncia exige participação, grava denunciante real e fica isolada por conta", async () => {
      expectStatus(await request(`/api/denuncias/postagens/${postId}`, "POST", c, { motivo: "TESTE denúncia sem participação" }), 403, "Terceira conta não denuncia postagem privada");
      const result = expectStatus(await request(`/api/denuncias/postagens/${postId}`, "POST", b, { motivo: `TESTE denúncia ${namespace}`, id_usr_denunciante: c.id }), 201, "Denúncia por participante");
      assert.equal(result.denuncia.id_denunciante, b.id);
      const own = expectStatus(await request("/api/denuncias/minhas", "GET", b), 200, "Denúncias próprias");
      assert.equal(own.denuncias.some(item => item.id_den === result.denuncia.id_den && item.tipo === "POSTAGEM"), true);
      const other = expectStatus(await request("/api/denuncias/minhas", "GET", c), 200, "Isolamento das denúncias");
      assert.equal(other.denuncias.some(item => item.id_den === result.denuncia.id_den), false);
    });

    await t.test("catálogos e recomendações têm contratos HTTP reais", async () => {
      const interests = expectStatus(await request("/api/interesses", "GET", a), 200, "Catálogo de interesses");
      assert.equal(Array.isArray(interests), true);
      const contents = expectStatus(await request("/api/conteudos", "GET", a), 200, "Catálogo de conteúdo");
      assert.equal(Array.isArray(contents.conteudos), true);
      for (const type of ["usuarios", "foruns", "conteudos"]) {
        const result = expectStatus(await request(`/api/recomendacoes/${type}`, "GET", a), 200, "Recomendações");
        assert.equal(Array.isArray(result.recomendacoes), true);
        if (type === "usuarios") {
          assert.equal(result.recomendacoes.some(item => item.id === a.id || item.id === b.id), false, "Não recomenda a própria conta nem conexão existente");
        }
      }
    });

    await t.test("Pro protege materiais e rejeita pagamento forjado sem ativar assinatura", async () => {
      const before = expectStatus(await request("/api/pro", "GET", a), 200, "Status Pro");
      assert.equal(before.ativo, false);
      assert.equal(before.provedor_disponivel, false);
      const catalog = expectStatus(await request("/api/pro/catalogo", "GET", a), 200, "Catálogo público autenticado Pro");
      assert.equal(Array.isArray(catalog.conteudos), true);
      assert.equal(catalog.conteudos.every(item => !("material" in item) && !("anexos" in item)), true, "Catálogo não vaza material exclusivo");
      expectStatus(await request("/api/pro/conteudos", "GET", a), 403, "Materiais exigem Pro validado");
      expectStatus(await request(`/api/pro/conteudos/${catalog.conteudos[0]?.id ?? "1"}`, "GET", a), 403, "Detalhe exige Pro validado");
      // Só verifica recusa do endpoint legado; não cria checkout nem efetua compra.
      expectStatus(await request("/api/assinatura", "POST", a, { valor: 0, forma_pagamento: "TESTE", pago: true, ativo: true, id_usr: b.id }), 503, "Valor e confirmação do cliente não concedem Pro");
      const after = expectStatus(await request("/api/assinatura", "GET", a), 200, "Status após tentativa recusada");
      assert.equal(after.ativo, false);
      assert.equal(after.registro_legado, before.registro_legado, "Nenhum registro de assinatura criado");
      assert.equal(after.status, before.status);
    });
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await prisma.$disconnect();
  }
});
