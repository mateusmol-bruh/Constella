const express =
  require("express");

const autenticar =
  require("../middlewares/auth.middleware");

const usuarioController =
  require("../controllers/usuario.controller");

const router = express.Router();

router.use(autenticar);

router.get(
  "/",
  usuarioController.listar
);

router.get(
  "/:id",
  usuarioController.buscarPorId
);

module.exports = router;