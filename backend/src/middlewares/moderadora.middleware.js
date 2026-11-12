const { verificarJWT, validarSessao }=require('../services/sessao.service');
const {lerCookie,validarCsrf}=require('../utils/moderacao-cookie');
async function autenticarModeradora(req,res,next) {
 const header=req.headers.authorization;
 const match=header && /^Bearer ([^ ]+)$/.exec(header);
 const token=header ? match?.[1] : lerCookie(req);
 if(!token) return res.status(401).json({mensagem:'Entre com uma conta de moderadora.'});
 let payload;
 try{payload=verificarJWT(token);}catch{return res.status(401).json({mensagem:'Sessão inválida ou expirada.'});}
 if(payload.tipo!=='moderadora') return res.status(403).json({mensagem:'Acesso exclusivo para moderadoras.'});
 try {
  req.sessaoId=await validarSessao(payload);
  if(!header && !['GET','HEAD','OPTIONS'].includes(req.method)) validarCsrf(req,token);
  req.moderadoraId=payload.sub; req.sessionToken=token;
  return next();
 }catch(error){return next(error);}
}
module.exports=autenticarModeradora;
