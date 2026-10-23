const prisma = require('../config/prisma');
const invalid = (message, statusCode = 400) => Object.assign(new Error(message), { statusCode });
function id(value) {
  const text = String(value ?? '');
  if (!/^[1-9]\d{0,18}$/.test(text) || BigInt(text) > 9223372036854775807n) throw invalid('ID inválido.');
  return BigInt(text);
}
function filtroVisivel(user) {
  return { bloqueios_recebidos:{ none:{ id_usr_origem:id(user) } }, bloqueios_enviados:{ none:{ id_usr_destino:id(user) } } };
}
async function status(user, target) {
  const origem = id(user), destino = id(target);
  const rows = await prisma.bloqueio.findMany({ where:{ OR:[{id_usr_origem:origem,id_usr_destino:destino},{id_usr_origem:destino,id_usr_destino:origem}] } });
  return { bloqueada:rows.some(row=>row.id_usr_origem===origem), interacao_bloqueada:rows.length>0 };
}
async function permitir(user, target) {
  if ((await status(user,target)).interacao_bloqueada) throw invalid('Interação indisponível por bloqueio entre as contas.',403);
}
async function bloquear(user,target) {
  const origem=id(user), destino=id(target);
  if (origem===destino) throw invalid('Você não pode bloquear sua própria conta.');
  if (!await prisma.usuaria.findUnique({where:{id_usr:destino},select:{id_usr:true}})) throw invalid('Usuária não encontrada.',404);
  await prisma.bloqueio.upsert({where:{id_usr_origem_id_usr_destino:{id_usr_origem:origem,id_usr_destino:destino}},create:{id_usr_origem:origem,id_usr_destino:destino},update:{}});
  return status(user,target);
}
async function desbloquear(user,target) {
  await prisma.bloqueio.deleteMany({where:{id_usr_origem:id(user),id_usr_destino:id(target)}});
  return status(user,target);
}
async function listar(user) {
  const rows=await prisma.bloqueio.findMany({where:{id_usr_origem:id(user)},include:{destino:{select:{id_usr:true,nome_usr:true,foto_usr:true}}},orderBy:{dt_bloqueio:'desc'}});
  return rows.map(row=>({id:row.destino.id_usr.toString(),nome:row.destino.nome_usr,foto:row.destino.foto_usr,interesses:[]}));
}
module.exports={id,filtroVisivel,status,permitir,bloquear,desbloquear,listar};
