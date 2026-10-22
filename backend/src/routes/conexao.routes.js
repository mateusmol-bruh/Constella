const express = require("express");

const autenticar = require("../middlewares/auth.middleware");

const conexaoController = require("../controllers/conexao.controller");

const router = express.Router();

// Todas as rotas precisam de autenticação JWT
router.use(autenticar);

// Listar solicitações recebidas
router.get(
  "/recebidas",
  conexaoController.recebidas
);

// Listar solicitações enviadas
router.get(
  "/enviadas",
  conexaoController.enviadas
);

// Listar conexões aceitas
router.get(
  "/",
  conexaoController.listar
);

// Enviar solicitação de conexão
router.post(
  "/:id",
  conexaoController.enviar
);

// Aceitar solicitação
router.patch(
  "/:id/aceitar",
  conexaoController.aceitar
);

// Recusar solicitação
router.patch(
  "/:id/recusar",
  conexaoController.recusar
);

module.exports = router;
