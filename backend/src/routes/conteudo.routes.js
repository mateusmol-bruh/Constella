const express =
  require("express");

const autenticar =
  require("../middlewares/auth.middleware");

const conteudoController =
  require("../controllers/conteudo.controller");

const router =
  express.Router();

router.use(autenticar);

router.get(
  "/",
  conteudoController.listar
);

router.get(
  "/:id",
  conteudoController.buscar
);

router.post(
  "/:id/acesso",
  conteudoController.acesso
);

router.patch(
  "/:id/progresso",
  conteudoController.progresso
);

module.exports = router;