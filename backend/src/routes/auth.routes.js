
const { Router } = require("express");
const { rateLimit } = require("express-rate-limit");
const { login } = require("../controllers/auth.controller");

const router = Router();

const limitarTentativas = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    mensagem: "Muitas tentativas. Tente novamente mais tarde."
  }
});

router.post("/login", limitarTentativas, login);

module.exports = router;
