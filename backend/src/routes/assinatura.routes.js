const express =
  require("express");

const autenticar =
  require("../middlewares/auth.middleware");

const assinaturaController =
  require("../controllers/assinatura.controller");

const router =
  express.Router();

router.use(autenticar);

router.get(
  "/",
  assinaturaController.buscar
);

router.post(
  "/",
  assinaturaController.criar
);

router.delete(
  "/",
  assinaturaController.cancelar
);

module.exports = router;