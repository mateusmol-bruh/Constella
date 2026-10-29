const express =
  require("express");

const autenticar =
  require("../middlewares/auth.middleware");

const forumController =
  require("../controllers/forum.controller");

const postagemController =
  require("../controllers/postagem.controller");

const router = express.Router();

router.use(autenticar);
router.get('/limites', forumController.limites);
router.post("/:id/leitura", require("../controllers/leitura.controller").forum);

router.get(
  "/",
  forumController.listar
);

router.get(
  "/meus",
  forumController.meus
);

router.post(
  "/",
  forumController.criar
);

router.get(
  "/:id",
  forumController.buscar
);

router.put(
  "/:id",
  forumController.editar
);

router.delete(
  "/:id",
  forumController.excluir
);

router.post(
  "/:id/entrar",
  forumController.entrar
);

router.delete(
  "/:id/sair",
  forumController.sair
);

router.get(
  "/:id/postagens",
  postagemController.listar
);

router.post(
  "/:id/postagens",
  postagemController.criar
);

module.exports = router;
