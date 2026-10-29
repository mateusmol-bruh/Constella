const { Router } = require("express");
const { rateLimit } = require("express-rate-limit");

const { login } = require("../controllers/auth.controller");
const { cadastrar } = require("../controllers/cadastro.controller");

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

const limitarCadastros = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    mensagem: "Muitas tentativas de cadastro. Tente novamente mais tarde."
  }
});

router.post("/login", limitarTentativas, login);
router.post("/cadastro", limitarCadastros, cadastrar);
router.post('/logout', require('../middlewares/auth.middleware'), async(req,res,next)=>{
 try{await require('../services/sessao.service').revogarSessao(req.sessaoId);return res.status(204).end();}catch(error){return next(error);}
});
module.exports = router;
