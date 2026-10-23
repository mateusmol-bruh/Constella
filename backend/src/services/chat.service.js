
const prisma = require("../config/prisma");

function erroHttp(status, mensagem) {
  const erro = new Error(mensagem);
  erro.statusCode = status;
  return erro;
}

// Valida IDs BigInt recebidos pela API.
function validarId(valor, campo = "ID") {
  const texto = String(valor ?? "");
  if (
    !/^[1-9]\d*$/.test(texto) ||
    texto.length > 19 ||
    BigInt(texto) > 9223372036854775807n ||
    typeof valor === "boolean"
  ) {
    throw erroHttp(400, `${campo} inválido.`);
  }

  return BigInt(valor);
}

// Garante que as duas usuárias possuem conexão aceita.
async function verificarConexao(idA, idB) {
  if (idA === idB) {
    throw erroHttp(
      400,
      "Não é possível iniciar uma conversa consigo mesma."
    );
  }

  const conexao = await prisma.conexao.findFirst({
    where: {
      status_conexao: "ACEITO",
      OR: [
        {
          id_user_solicit: idA,
          id_user_receb: idB
        },
        {
          id_user_solicit: idB,
          id_user_receb: idA
        }
      ]
    }
  });

  if (!conexao) {
    throw erroHttp(
      403,
      "É necessário ter uma conexão aceita para conversar."
    );
  }

  return conexao;
}

function formatarChat(chat) {
  return {
    id_chat: chat.id_chat.toString(),
    id_usr_01: chat.id_usr_01.toString(),
    id_usr_02: chat.id_usr_02.toString(),
    dt_inicio: chat.dt_inicio
  };
}

function formatarMensagem(mensagem) {
  return {
    id_msg: mensagem.id_msg.toString(),
    id_chat: mensagem.id_chat.toString(),
    id_usr_emissor: mensagem.id_usr_emissor.toString(),
    conteudo: mensagem.cont_msg,
    imagem: mensagem.imagem_msg,
    dt_envio: mensagem.dt_envio
  };
}

// Confere se o chat existe e pertence à usuária.
// Também verifica se a conexão continua aceita.
async function verificarAcessoChat(idChat, idUsuario) {
  const chat = await prisma.chat.findUnique({
    where: {
      id_chat: idChat
    }
  });

  if (!chat) {
    throw erroHttp(404, "Chat não encontrado.");
  }

  const participante =
    chat.id_usr_01 === idUsuario ||
    chat.id_usr_02 === idUsuario;

  if (!participante) {
    throw erroHttp(403, "Você não participa deste chat.");
  }

  const outraUsuaria =
    chat.id_usr_01 === idUsuario
      ? chat.id_usr_02
      : chat.id_usr_01;

  await verificarConexao(idUsuario, outraUsuaria);

  return chat;
}

// POST /api/chats
async function criarOuBuscarChat(idUsuario, idDestinataria) {
  const idA = validarId(idUsuario);
  const idB = validarId(idDestinataria, "Destinatária");

  await verificarConexao(idA, idB);
  await require("./bloqueio.service").permitir(idA,idB);

  // Ordenação padronizada dos participantes.
  const [primeiro, segundo] =
    idA < idB ? [idA, idB] : [idB, idA];

  // Procura o chat independentemente da ordem antiga.
  let chat = await prisma.chat.findFirst({
    where: {
      OR: [
        {
          id_usr_01: primeiro,
          id_usr_02: segundo
        },
        {
          id_usr_01: segundo,
          id_usr_02: primeiro
        }
      ]
    }
  });

  if (chat) {
    return {
      criado: false,
      chat: formatarChat(chat)
    };
  }

  chat = await prisma.chat.create({
    data: {
      id_usr_01: primeiro,
      id_usr_02: segundo
    }
  });

  return {
    criado: true,
    chat: formatarChat(chat)
  };
}

// GET /api/chats
async function listarChats(idUsuario) {
  const idUsr = validarId(idUsuario);

  const chats = await prisma.chat.findMany({
    where: {
      OR: [
        { id_usr_01: idUsr },
        { id_usr_02: idUsr }
      ]
    },
    orderBy: {
      dt_inicio: "desc"
    }
  });

  // Evita expor uma conversa cuja conexão foi desfeita.
  const resultado = [];

  for (const chat of chats) {
    const outraUsuaria =
      chat.id_usr_01 === idUsr
        ? chat.id_usr_02
        : chat.id_usr_01;

    try {
      await verificarConexao(idUsr, outraUsuaria);
    } catch (error) {
      if (error.statusCode === 403) continue;
      throw error;
    }

    const participante = await prisma.usuaria.findUnique({
      where: { id_usr: outraUsuaria },
      select: {
        id_usr: true,
        nome_usr: true,
        foto_usr: true
      }
    });

    resultado.push({
      ...formatarChat(chat),
      ...await resumoChat(chat,idUsr),
      destinataria: participante
        ? {
            id: participante.id_usr.toString(),
            nome: participante.nome_usr,
            foto: participante.foto_usr
          }
        : null
    });
  }

  return resultado.sort((a,b)=>new Date(b.ultima_mensagem?.dt_envio || b.dt_inicio)-new Date(a.ultima_mensagem?.dt_envio || a.dt_inicio));
}

// GET /api/chats/:id
async function buscarChat(idUsuario, idChat) {
  const idUsr = validarId(idUsuario);
  const idConversa = validarId(idChat, "Chat");

  const chat = await verificarAcessoChat(idConversa, idUsr);

  const other=chat.id_usr_01===idUsr?chat.id_usr_02:chat.id_usr_01;
  const person=await prisma.usuaria.findUnique({where:{id_usr:other},select:{id_usr:true,nome_usr:true,foto_usr:true}});
  return {...formatarChat(chat),...await require("./bloqueio.service").status(idUsr,other),destinataria:person?{id:person.id_usr.toString(),nome:person.nome_usr,foto:person.foto_usr}:null};
}

// GET /api/chats/:id/mensagens
async function listarMensagens(
  idUsuario,
  idChat,
  pagina = 1,
  limite = 50
) {
  const idUsr = validarId(idUsuario);
  const idConversa = validarId(idChat, "Chat");

  await verificarAcessoChat(idConversa, idUsr);

  const mensagens = await prisma.mensagem.findMany({
    where: {
      id_chat: idConversa
    },
    orderBy: [
      { dt_envio: "desc" },
      { id_msg: "desc" }
    ],
    skip: (pagina - 1) * limite,
    take: limite
  });

  return mensagens
    .reverse()
    .map(formatarMensagem);
}

// POST /api/chats/:id/mensagens
async function enviarMensagem(idUsuario, idChat, conteudo, imagem = null) {
  const idUsr = validarId(idUsuario);
  const idConversa = validarId(idChat, "Chat");

  const chat=await verificarAcessoChat(idConversa,idUsr);
  await require("./bloqueio.service").permitir(idUsr,chat.id_usr_01===idUsr?chat.id_usr_02:chat.id_usr_01);
  if (imagem) await require("./anexo.service").validarAnexo(imagem,idUsr);
  const mensagem = await prisma.$transaction(async tx => {
    const saved = await tx.mensagem.create({
    data: {
      id_chat: idConversa,
      id_usr_emissor: idUsr,
      cont_msg: conteudo,
      imagem_msg: imagem
    }
    });
    await require('./notificacao.service').enfileirar(tx, { chave: `mensagem:${saved.id_msg}`, tipo: 'chat', recurso: idConversa, autor: idUsr,
      destinatarias: [chat.id_usr_01 === idUsr ? chat.id_usr_02 : chat.id_usr_01], foto: !!imagem });
    return saved;
  });
  return formatarMensagem(mensagem);
}

//apagar mensagens

async function excluirMensagem(idUsuario, idChat, idMensagem) {
  const idUsr = validarId(idUsuario);
  const idConversa = validarId(idChat, "Chat");
  const idMsg = validarId(idMensagem, "Mensagem");

  // Confirma que a usuária participa do chat
  await verificarAcessoChat(idConversa, idUsr);

  // Busca a mensagem dentro do chat informado
  const mensagem = await prisma.mensagem.findFirst({
    where: {
      id_msg: idMsg,
      id_chat: idConversa
    }
  });

  if (!mensagem) {
    throw erroHttp(404, "Mensagem não encontrada.");
  }

  // Só quem enviou pode excluir
  if (mensagem.id_usr_emissor !== idUsr) {
    throw erroHttp(
      403,
      "Você só pode excluir mensagens enviadas por você."
    );
  }

  // Exclui apenas se ainda pertencer à usuária e ao chat
  let resultado;
  try {
    resultado = await prisma.mensagem.deleteMany({
      where: {
        id_msg: idMsg,
        id_chat: idConversa,
        id_usr_emissor: idUsr
      }
    });
  } catch (error) {
    if (error.code === "P2003") {
      throw erroHttp(409, "Esta mensagem possui registros relacionados e não pode ser excluída.");
    }
    throw error;
  }

  if (resultado.count === 0) {
    throw erroHttp(404, "Mensagem não encontrada.");
  }

  return {
    mensagem: "Mensagem excluída com sucesso."
  };
}


module.exports = {
  criarOuBuscarChat,
  listarChats,
  buscarChat,
  listarMensagens,
  enviarMensagem,
  excluirMensagem
};

async function resumoChat(chat,user) {
 const leitura=await prisma.chat_leitura.findUnique({where:{id_chat_id_usr:{id_chat:chat.id_chat,id_usr:user}}});
 const [last,unread]=await Promise.all([
  prisma.mensagem.findFirst({where:{id_chat:chat.id_chat},orderBy:[{dt_envio:'desc'},{id_msg:'desc'}]}),
  prisma.mensagem.count({where:{id_chat:chat.id_chat,id_usr_emissor:{not:user},id_msg:{gt:leitura?.ultima_mensagem ?? 0n}}})
 ]);
 return {ultima_mensagem:last?formatarMensagem(last):null,nao_lidas:unread};
}
