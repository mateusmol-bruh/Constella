const express =
  require("express");

const autenticar =
  require("../middlewares/auth.middleware");

const {
  listar,
  listarMeus,
  atualizarMeus
} = require(
  "../controllers/interesse.controller"
);

const router = express.Router();

// Lista todos os interesses disponíveis
router.get(
  "/",
  autenticar,
  listar
);

// Lista os interesses da usuária logada
router.get(
  "/meus",
  autenticar,
  listarMeus
);

// Substitui os interesses da usuária
router.put(
  "/meus",
  autenticar,
  atualizarMeus
);

module.exports = router;