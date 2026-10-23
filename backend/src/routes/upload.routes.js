const express = require('express');
const { rateLimit } = require('express-rate-limit');
const autenticar = require('../middlewares/auth.middleware');
const prisma = require('../config/prisma');
const { saveImage, uploadsDirectory } = require('../services/upload.service');
const router = express.Router();

router.post('/imagens', autenticar, rateLimit({
  windowMs:60 * 60 * 1000, limit:40, keyGenerator:req=>req.usuarioId,
  standardHeaders:'draft-8', legacyHeaders:false,
  message:{ mensagem:'Limite de envio de imagens atingido. Tente novamente mais tarde.' },
}), express.json({ limit:'3mb' }), async (req,res,next)=>{
  try {
    const account = await prisma.usuaria.findUnique({ where:{ id_usr:BigInt(req.usuarioId) }, select:{ id_usr:true } });
    if (!account) return res.status(401).json({ mensagem:'Entre novamente para enviar uma imagem.' });
    const privateImage=req.body?.privada === true;
    return res.status(201).json(privateImage
      ? await require('../services/anexo.service').salvar(req.body?.imagem,req.usuarioId)
      : await saveImage(req.body?.imagem));
  } catch(error) { return next(error); }
});

function serveImage(req,res,next) {
  const name = req.params.nome;
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\.(jpg|png)$/.test(name)) {
    return res.status(404).json({ mensagem:'Imagem não encontrada.' });
  }
  res.set('X-Content-Type-Options','nosniff');
  res.set('Content-Security-Policy',"default-src 'none'; sandbox");
  res.set('Cache-Control','public, max-age=31536000, immutable');
  return res.sendFile(name, { root:uploadsDirectory, dotfiles:'deny' }, error=>{
    if (!error) return;
    if (error.statusCode === 404) return res.status(404).json({ mensagem:'Imagem não encontrada.' });
    return next(error);
  });
}
module.exports = { router, serveImage };
