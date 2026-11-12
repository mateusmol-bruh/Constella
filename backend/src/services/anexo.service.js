const path=require('node:path');
const fs=require('node:fs/promises');
const {randomUUID}=require('node:crypto');
const {validateImage,uploadsDirectory}=require('./upload.service');
const prisma=require('../config/prisma');
const {id}=require('./bloqueio.service');
const directory=path.join(uploadsDirectory,'privado');
const pattern=/^([1-9]\d{0,18})-[a-f0-9-]{36}\.(jpg|png)$/;
const invalid=(message,statusCode=400)=>Object.assign(new Error(message),{statusCode});
async function salvar(encoded,user) {
 const {data,extension}=validateImage(encoded);
 await fs.mkdir(directory,{recursive:true});
 const name=`${id(user)}-${randomUUID()}.${extension}`;
 await fs.writeFile(path.join(directory,name),data,{flag:'wx',mode:0o600});
 return {caminho:`/api/anexos/${name}`};
}
async function validarAnexo(value,user,db=prisma) {
 if(typeof value!=='string' || !value.startsWith('/api/anexos/')) throw invalid('Anexo inválido.');
 const name=value.slice('/api/anexos/'.length),match=pattern.exec(name);
 if(!match || match[1]!==id(user).toString()) throw invalid('O anexo deve pertencer à sua conta.',403);
 try {await fs.stat(path.join(directory,name));}catch {throw invalid('Anexo não encontrado.',404);}
 // Cada upload pertence a uma única mensagem ou postagem. Evita reutilização entre conversas.
 const [message,post]=await Promise.all([db.mensagem.findFirst({where:{imagem_msg:value},select:{id_msg:true}}),db.postagem.findFirst({where:{img_post:value},select:{id_post:true}})]);
 if(message||post) throw invalid('Este anexo já foi enviado. Escolha a imagem novamente.',409);
}
async function autorizar(name,user) {
 if(!pattern.test(name)) throw invalid('Imagem não encontrada.',404);
 const value=`/api/anexos/${name}`,usr=id(user);
 const message=await prisma.mensagem.findFirst({where:{imagem_msg:value,chat:{OR:[{id_usr_01:usr},{id_usr_02:usr}]}},select:{id_msg:true}});
 const post=await prisma.postagem.findFirst({where:{img_post:value,forum:{usuaria_forum:{some:{id_usr:usr}}}},select:{id_post:true}});
 if(!message&&!post) throw invalid('Imagem indisponível.',404);
}
module.exports={salvar,validarAnexo,autorizar,directory};
