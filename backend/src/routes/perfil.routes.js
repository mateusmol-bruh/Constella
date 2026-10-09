const express = require("express");

const autenticar =
  require("../middlewares/auth.middleware");

const {
  obterPerfil,
  editarPerfil
} = require("../controllers/perfil.controller");

const router = express.Router();

router.get(
  "/",
  autenticar,
  obterPerfil
);

router.put(
  "/",
  autenticar,
  editarPerfil
);

module.exports = router;