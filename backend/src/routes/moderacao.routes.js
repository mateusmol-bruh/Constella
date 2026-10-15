const express =
  require("express");

const autenticarModeradora =
  require(
    "../middlewares/moderadora.middleware"
  );

const moderacaoController =
  require(
    "../controllers/moderacao.controller"
  );

const router =
  express.Router();

router.post(
  "/login",
  moderacaoController.login
);

router.use(
  autenticarModeradora
);

router.get(
  "/denuncias",
  moderacaoController.listar
);

router.get(
  "/denuncias/:id",
  moderacaoController.buscar
);

router.patch(
  "/denuncias/:id/status",
  moderacaoController.atualizarStatus
);

router.get(
  "/relatorios",
  moderacaoController.relatorios
);

module.exports = router;