const { Router } = require("express");
const { rateLimit } = require("express-rate-limit");
const { listarConteudos, detalharConteudo, listarForuns, apresentarPro } = require("../controllers/publico.controller");

const router = Router();
router.use(rateLimit({
  windowMs: 60 * 1000, limit: 120, standardHeaders: "draft-8", legacyHeaders: false,
  message: { mensagem: "Muitas consultas. Aguarde um pouco e tente novamente." }
}));
router.get("/conteudos", listarConteudos);
router.get("/conteudos/:id", detalharConteudo);
router.get("/foruns", listarForuns);
router.get("/pro", apresentarPro);

module.exports = router;
