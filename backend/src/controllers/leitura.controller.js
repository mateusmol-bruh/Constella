const service=require('../services/leitura.service');
const handle=action=>async(req,res,next)=>{try {res.json(await action(req.usuarioId,req.params.id,req.body?.ultima_id));}catch(error){next(error);}};
module.exports={chat:handle(service.marcarChat),forum:handle(service.marcarForum)};
