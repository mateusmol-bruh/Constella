const express =
  require("express");

const autenticar =
  require(
    "../middlewares/auth.middleware"
  );

const recomendacaoController =
  require(
    "../controllers/recomendacao.controller"
  );

const router =
  express.Router();

router.use(autenticar);

router.get(
  "/usuarios",
  recomendacaoController.usuarios
);

router.get(
  "/foruns",
  recomendacaoController.foruns
);

router.get(
  "/conteudos",
  recomendacaoController.conteudos
);

module.exports = router;