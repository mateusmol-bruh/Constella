const service=require('../services/bloqueio.service');
const handle=action=>async(req,res,next)=>{try {res.json(await action(req.usuarioId,req.params.id));} catch(error){next(error);} };
module.exports={listar:handle(service.listar),status:handle(service.status),bloquear:handle(service.bloquear),desbloquear:handle(service.desbloquear)};
