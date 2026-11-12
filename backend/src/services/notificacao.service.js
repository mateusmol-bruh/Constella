const prisma = require('../config/prisma');
const { id } = require('./bloqueio.service');

const enabled = () => process.env.CONSTELLA_PUSH_ENABLED === 'true';
const tokenValido = value => typeof value === 'string' && /^(ExpoPushToken|ExponentPushToken)\[[A-Za-z0-9_-]{10,200}\]$/.test(value);
const invalid = message => Object.assign(new Error(message), { statusCode: 400 });

async function registrar(user, dados) {
  if (!tokenValido(dados.token) || !['android', 'ios'].includes(dados.plataforma)) throw invalid('Dispositivo inválido.');
  if (!enabled()) throw Object.assign(new Error('As notificações ainda não estão disponíveis. Tente novamente mais tarde.'), { statusCode: 503 });
  const owner = id(user);
  // Um token pertence à conta atualmente conectada neste aparelho. Nenhum token é devolvido à UI.
  await prisma.$transaction(async tx => {
    await tx.dispositivo_push.upsert({
      where: { token: dados.token },
      create: { token: dados.token, id_usr: owner, plataforma: dados.plataforma },
      update: { id_usr: owner, plataforma: dados.plataforma, ativo: true },
    });
    // Mensagens enfileiradas para uma sessão anterior não são entregues na nova conta.
    await tx.notificacao_push.updateMany({
      where: { token: dados.token, id_usr: { not: owner }, estado: { in: ['PENDENTE', 'ENVIANDO', 'AGUARDANDO'] } },
      data: { estado: 'CANCELADA' },
    });
  });
  return { ativo: true };
}
async function desregistrar(user, token) {
  if (!tokenValido(token)) throw invalid('Dispositivo inválido.');
  await prisma.$transaction(async tx => {
    await tx.dispositivo_push.updateMany({ where: { token, id_usr: id(user) }, data: { ativo: false } });
    await tx.notificacao_push.updateMany({ where: { token, id_usr: id(user), estado: { in: ['PENDENTE', 'ENVIANDO', 'AGUARDANDO'] } }, data: { estado: 'CANCELADA' } });
  });
  return { ativo: false };
}

// Deve ser chamada na MESMA transação que grava o evento social.
async function enfileirar(tx, { chave, tipo, recurso, autor, destinatarias, foto = false }) {
  if (!enabled()) return;
  const owners = [...new Set(destinatarias.map(String))].filter(owner => owner !== String(autor)).map(BigInt);
  if (!owners.length) return;
  const devices = await tx.dispositivo_push.findMany({ where: { id_usr: { in: owners }, ativo: true } });
  if (!devices.length) return;
  await tx.notificacao_push.createMany({
    data: devices.map(device => ({ chave, token: device.token, id_usr: device.id_usr,
      dados: { tipo, id: String(recurso), autor: String(autor), destinataria: String(device.id_usr), foto } })),
    skipDuplicates: true,
  });
}

async function permitido(row) {
  const user = row.id_usr, dados = row.dados;
  if (!row.dispositivo.ativo || row.dispositivo.id_usr !== user) return false;
  const device = await prisma.dispositivo_push.findUnique({ where: { token: row.token }, select: { ativo: true, id_usr: true } });
  if (!device?.ativo || device.id_usr !== user) return false;
  if (Date.now() - row.criado_em.getTime() > 24 * 60 * 60 * 1000) return false;
  const blocked = await prisma.bloqueio.findFirst({ where: { OR: [
    { id_usr_origem: user, id_usr_destino: id(dados.autor) },
    { id_usr_origem: id(dados.autor), id_usr_destino: user },
  ] } });
  if (blocked) return false;
  if (dados.tipo === 'chat') {
    const message = await prisma.mensagem.findUnique({ where: { id_msg: id(row.chave.split(':')[1]) }, include: { chat: true } });
    if (!message || (message.chat.id_usr_01 !== user && message.chat.id_usr_02 !== user)) return false;
    const other = message.chat.id_usr_01 === user ? message.chat.id_usr_02 : message.chat.id_usr_01;
    if (!await prisma.conexao.findFirst({ where: { status_conexao: 'ACEITO', OR: [{ id_user_solicit: user, id_user_receb: other }, { id_user_solicit: other, id_user_receb: user }] } })) return false;
    const reading = await prisma.chat_leitura.findUnique({ where: { id_chat_id_usr: { id_chat: message.id_chat, id_usr: user } } });
    return !reading || reading.ultima_mensagem < message.id_msg;
  }
  if (dados.tipo === 'forum') {
    const member = await prisma.usuaria_forum.findUnique({ where: { id_for_id_usr: { id_for: id(dados.id), id_usr: user } } });
    const post = await prisma.postagem.findUnique({ where: { id_post: id(row.chave.split(':')[1]) }, select: { id_post: true, id_for: true, tipo_post: true } });
    return !!member && !!post && post.id_for === id(dados.id) && post.tipo_post === 'MENSAGEM' && member.ultima_postagem_lida < post.id_post;
  }
  if (dados.tipo === 'conexao') {
    const connection = await prisma.conexao.findUnique({ where: { id_conexao: id(dados.id) } });
    return !!connection && [connection.id_user_solicit, connection.id_user_receb].includes(user) &&
      (row.chave.startsWith('solicitacao:') ? connection.status_conexao === 'PENDENTE' : connection.status_conexao === 'ACEITO');
  }
  return false;
}
// O conteúdo é lido só após validar o acesso; não é copiado para a fila persistente.
async function conteudo(row) {
  const author = await prisma.usuaria.findUnique({ where: { id_usr: id(row.dados.autor) }, select: { nome_usr: true } });
  const name = author?.nome_usr.slice(0, 80) || 'Uma usuária';
  if (row.dados.tipo === 'chat') {
    const message = await prisma.mensagem.findUnique({ where: { id_msg: id(row.chave.split(':')[1]) }, select: { cont_msg: true, imagem_msg: true } });
    return message?.imagem_msg
      ? { title: `${name} enviou uma foto.`, body: message.cont_msg.slice(0, 160) || 'Toque para abrir a conversa.' }
      : { title: `Nova mensagem de ${name}`, body: message?.cont_msg.slice(0, 160) || 'Toque para abrir a conversa.' };
  }
  if (row.dados.tipo === 'forum') {
    const forum = await prisma.forum.findUnique({ where: { id_for: id(row.dados.id) }, select: { titulo_for: true } });
    return { title: `Nova mensagem em ${forum?.titulo_for.slice(0, 100) || 'fórum'}`, body: `${name} enviou ${row.dados.foto ? 'uma foto' : 'uma mensagem'} no fórum.` };
  }
  return row.chave.startsWith('aceite:')
    ? { title: 'Conexão aceita', body: `${name} aceitou sua solicitação de conexão.` }
    : { title: 'Nova solicitação de conexão', body: `${name} quer se conectar com você!` };
}
module.exports = { enabled, tokenValido, registrar, desregistrar, enfileirar, permitido, conteudo };
