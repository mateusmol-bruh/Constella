const express =
  require("express");

const autenticar =
  require("../middlewares/auth.middleware");

const denunciaController =
  require("../controllers/denuncia.controller");

const router = express.Router();

router.use(autenticar);

router.get(
  "/minhas",
  denunciaController.minhas
);

router.post(
  "/usuarias/:id",
  denunciaController.denunciarUsuaria
);

router.post(
  "/postagens/:id",
  denunciaController.denunciarPostagem
);

router.post(
  "/mensagens/:id",
  denunciaController.denunciarMensagem
);

module.exports = router;