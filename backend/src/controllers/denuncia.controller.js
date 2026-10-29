const service=require('../services/denuncia.service');
const wrap=fn=>async(req,res,next)=>{try{return await fn(req,res);}catch(e){return next(e);}};
const send=(method)=>wrap(async(req,res)=>res.status(201).json({mensagem:'Denúncia registrada com sucesso.',denuncia:await service[method](req.usuarioId,req.params.id,req.body?.motivo,req.body?.descricao)}));
module.exports={denunciarUsuaria:send('denunciarUsuaria'),denunciarPostagem:send('denunciarPostagem'),denunciarMensagem:send('denunciarMensagem'),minhas:wrap(async(req,res)=>res.json({denuncias:await service.listarMinhasDenuncias(req.usuarioId)}))};
