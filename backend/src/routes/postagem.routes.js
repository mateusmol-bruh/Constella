const express =
  require("express");

const autenticar =
  require("../middlewares/auth.middleware");

const postagemController =
  require("../controllers/postagem.controller");

const router =
  express.Router();

router.use(autenticar);

router.put(
  "/:id",
  postagemController.editar
);

router.delete(
  "/:id",
  postagemController.excluir
);

module.exports = router;