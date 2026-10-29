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
router.get('/conteudos/:id/midias/:arquivo',exigirPro,async(req,res,next)=>{try{const m=require('../services/midia-pro.service');m.deliver(await m.subscriberFile(req.params.id,req.params.arquivo),res,next);}catch(e){next(e);}});

router.post('/demonstracao', async (req, res, next) => {
  try {
    const { demoEnabled, changeDemo } = require('../services/pro-demo.service');
    if (!demoEnabled()) return res.status(403).json({ mensagem:'Demonstração PRO desativada no servidor. Use o comando npm run demo no backend.' });
    const prisma = require('../config/prisma');
    const account = await prisma.usuaria.findUnique({ where:{ id_usr:BigInt(req.usuarioId) }, select:{ id_usr:true } });
    if (!account) return res.status(401).json({ mensagem:'Conta indisponível. Entre novamente.' });
    changeDemo(req.usuarioId, req.body?.ativar);
    return res.status(200).json(await require('../services/assinatura.service').buscarStatusAssinatura(req.usuarioId));
  } catch (error) { return next(error); }
});

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
