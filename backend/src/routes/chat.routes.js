
const express = require("express");

const autenticar = require("../middlewares/auth.middleware");

const {
  criarChat,
  listarChats,
  buscarChat,
  listarMensagens,
  enviarMensagem,
  excluirMensagem
} = require("../controllers/chat.controller");

const router = express.Router();

// Todas as rotas exigem autenticação.
router.use(autenticar);

// Criar ou buscar conversa existente
router.post("/", criarChat);

// Listar conversas da usuária
router.get("/", listarChats);

// Buscar conversa por ID
router.get("/:id", buscarChat);

// Listar mensagens de uma conversa
router.get("/:id/mensagens", listarMensagens);

// Enviar mensagem
router.post("/:id/mensagens", enviarMensagem);

// Excluir mensagem
router.delete("/:id/mensagens/:idMensagem", excluirMensagem);

module.exports = router;
