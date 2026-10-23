const express =
  require("express");

const autenticar =
  require("../middlewares/auth.middleware");

const exigirPro =
  require("../middlewares/pro.middleware");

const proController =
  require("../controllers/pro.controller");

const router =
  express.Router();

router.use(autenticar);

router.get(
  "/",
  proController.status
);

router.get(
  "/catalogo",
  proController.catalogo
);

router.get(
  "/conteudos",
  exigirPro,
  proController.listar
);

router.get(
  "/conteudos/:id",
  exigirPro,
  proController.buscar
);

module.exports = router;
