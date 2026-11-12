const router=require('express').Router();
const service=require('../services/anexo.service');
router.use(require('../middlewares/auth.middleware'));
router.get('/:nome',async(req,res,next)=>{
 try {
  await service.autorizar(req.params.nome,req.usuarioId);
  res.set('Cache-Control','private, no-store');res.set('X-Content-Type-Options','nosniff');
  res.set('Content-Security-Policy',"default-src 'none'; sandbox");
  res.sendFile(req.params.nome,{root:service.directory,dotfiles:'deny'},error=>{if(error)next(error);});
 }catch(error){next(error);}
});
module.exports=router;
