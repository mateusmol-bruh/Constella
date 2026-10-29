const prisma=require('../config/prisma');
const {id}=require('./bloqueio.service');
const forbidden=()=>Object.assign(new Error('Você não participa desta conversa.'),{statusCode:403});
async function marcarChat(user,chat,last) {
  const usr=id(user), conversa=id(chat), mensagem=id(last);
  const row=await prisma.chat.findUnique({where:{id_chat:conversa}});
  if (!row || (row.id_usr_01!==usr && row.id_usr_02!==usr)) throw forbidden();
  if (!await prisma.mensagem.findFirst({where:{id_msg:mensagem,id_chat:conversa},select:{id_msg:true}})) throw Object.assign(new Error('Mensagem inválida.'),{statusCode:400});
  await prisma.$executeRaw`INSERT INTO chat_leitura (id_chat,id_usr,ultima_mensagem) VALUES (${conversa},${usr},${mensagem}) ON CONFLICT (id_chat,id_usr) DO UPDATE SET ultima_mensagem=GREATEST(chat_leitura.ultima_mensagem,EXCLUDED.ultima_mensagem)`;
  return {mensagem:'Leitura atualizada.'};
}
async function marcarForum(user,forum,last) {
  const usr=id(user), grupo=id(forum), post=id(last);
  if (!await prisma.usuaria_forum.findUnique({where:{id_for_id_usr:{id_for:grupo,id_usr:usr}}})) throw forbidden();
  if (!await prisma.postagem.findFirst({where:{id_post:post,id_for:grupo},select:{id_post:true}})) throw Object.assign(new Error('Postagem inválida.'),{statusCode:400});
  await prisma.usuaria_forum.updateMany({where:{id_for:grupo,id_usr:usr,ultima_postagem_lida:{lt:post}},data:{ultima_postagem_lida:post}});
  return {mensagem:'Leitura atualizada.'};
}
module.exports={marcarChat,marcarForum};
