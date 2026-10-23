const prisma =
  require("../config/prisma");

function erroHttp(
  statusCode,
  mensagem
) {
  const erro =
    new Error(mensagem);

  erro.statusCode =
    statusCode;

  return erro;
}

function validarId(
  valor,
  campo = "ID"
) {
  const texto = String(valor ?? "");
  if (
    !/^[1-9]\d*$/.test(texto) ||
    texto.length > 19 ||
    BigInt(texto) > 9223372036854775807n
  ) {
    throw erroHttp(
      400,
      `${campo} inválido.`
    );
  }

  return BigInt(valor);
}

function formatarPostagem(postagem) {
  return {
    id_post:
      postagem.id_post.toString(),

    conteudo:
      postagem.cont_post,

    imagem:
      postagem.img_post,

    dt_post:
      postagem.dt_post,

    autora:
      postagem.usuaria
        ? {
            id:
              postagem.usuaria
                .id_usr
                .toString(),

            nome:
              postagem.usuaria
                .nome_usr,

            foto:
              postagem.usuaria
                .foto_usr
          }
        : undefined
  };
}

async function verificarForum(
  idFor
) {
  const forum =
    await prisma.forum.findUnique({
      where: {
        id_for: idFor
      }
    });

  if (!forum) {
    throw erroHttp(
      404,
      "Fórum não encontrado."
    );
  }

  return forum;
}

async function verificarParticipacao(
  idUsr,
  idFor
) {
  const participacao =
    await prisma.usuaria_forum.findUnique({
      where: {
        id_for_id_usr: {
          id_for: idFor,
          id_usr: idUsr
        }
      }
    });

  if (!participacao) {
    throw erroHttp(
      403,
      "Você precisa participar do fórum para acessar as postagens."
    );
  }
}

async function listarPostagens(
  idUsuario,
  idForum,
  pagina = 1,
  limite = 50
) {
  const idUsr = validarId(idUsuario);

  if (
    !Number.isSafeInteger(pagina) || pagina < 1 ||
    !Number.isSafeInteger(limite) || limite < 1 || limite > 50 ||
    !Number.isSafeInteger((pagina - 1) * limite)
  ) {
    throw erroHttp(400, "Paginação inválida.");
  }

  const idFor =
    validarId(
      idForum,
      "Fórum"
    );

  await verificarForum(idFor);
  await verificarParticipacao(idUsr, idFor);

  const postagens =
    await prisma.postagem.findMany({
      where: {
        id_for: idFor
      },

      include: {
        usuaria: {
          select: {
            id_usr: true,
            nome_usr: true,
            foto_usr: true
          }
        }
      },

      skip: (pagina - 1) * limite,
      take: limite,
      orderBy: [
        {
          dt_post: "desc"
        },
        {
          id_post: "desc"
        }
      ]
    });

  return postagens.map(
    formatarPostagem
  );
}

async function criarPostagem(
  idUsuario,
  idForum,
  dados
) {
  const idUsr =
    validarId(idUsuario);

  const idFor =
    validarId(
      idForum,
      "Fórum"
    );

  await verificarForum(idFor);

  await verificarParticipacao(
    idUsr,
    idFor
  );

  const conteudo =
    typeof dados.conteudo ===
    "string"
      ? dados.conteudo.trim()
      : "";

  const imagem =
    typeof dados.imagem ===
      "string" &&
    dados.imagem.trim()
      ? dados.imagem.trim()
      : null;

  if ((!conteudo && !imagem) || conteudo.length > 1000) {
    throw erroHttp(
      400,
      "Envie texto de até 1000 caracteres e/ou uma imagem válida."
    );
  }

  if (
    imagem &&
    imagem.length > 500
  ) {
    throw erroHttp(
      400,
      "URL da imagem deve possuir no máximo 500 caracteres."
    );
  }

  if (imagem) await require("./anexo.service").validarAnexo(imagem,idUsr);
  const postagem = await prisma.$transaction(async tx => {
    const saved = await tx.postagem.create({
      data: {
        cont_post: conteudo,
        img_post: imagem,
        id_usr: idUsr,
        id_for: idFor
      },

      include: {
        usuaria: {
          select: {
            id_usr: true,
            nome_usr: true,
            foto_usr: true
          }
        }
      }
    });

    if (require('./notificacao.service').enabled()) {
      const members = await tx.usuaria_forum.findMany({ where: { id_for: idFor, id_usr: { not: idUsr } }, select: { id_usr: true } });
      await require('./notificacao.service').enfileirar(tx, { chave: `postagem:${saved.id_post}`, tipo: 'forum', recurso: idFor, autor: idUsr, destinatarias: members.map(member => member.id_usr), foto: !!imagem });
    }
    return saved;
  });
  return formatarPostagem(postagem);
}

async function editarPostagem(
  idUsuario,
  idPostagem,
  dados
) {
  const idUsr =
    validarId(idUsuario);

  const idPost =
    validarId(
      idPostagem,
      "Postagem"
    );

  const postagem =
    await prisma.postagem.findUnique({
      where: {
        id_post: idPost
      }
    });

  if (!postagem) {
    throw erroHttp(
      404,
      "Postagem não encontrada."
    );
  }

  if (
    postagem.id_usr !== idUsr
  ) {
    throw erroHttp(
      403,
      "Você só pode editar suas próprias postagens."
    );
  }

  await verificarParticipacao(idUsr, postagem.id_for);

  const atualizacao = {};

  if (
    dados.conteudo !== undefined
  ) {
    if (
      typeof dados.conteudo !==
        "string" ||
      !dados.conteudo.trim()
    ) {
      throw erroHttp(
        400,
        "Conteúdo inválido."
      );
    }

    atualizacao.cont_post =
      dados.conteudo.trim();
  }

  if (
    dados.imagem !== undefined
  ) {
    if (
      dados.imagem !== null &&
      (
        typeof dados.imagem !==
          "string" ||
        dados.imagem.length > 500
      )
    ) {
      throw erroHttp(
        400,
        "Imagem inválida."
      );
    }

    if (dados.imagem) await require("./anexo.service").validarAnexo(dados.imagem,idUsr);
    atualizacao.img_post =
      dados.imagem === null
        ? null
        : dados.imagem.trim();
  }

  if (
    Object.keys(atualizacao).length ===
    0
  ) {
    throw erroHttp(
      400,
      "Informe pelo menos um campo para atualizar."
    );
  }

  const atualizada =
    await prisma.postagem.update({
      where: {
        id_post: idPost
      },

      data: atualizacao,

      include: {
        usuaria: {
          select: {
            id_usr: true,
            nome_usr: true,
            foto_usr: true
          }
        }
      }
    });

  return formatarPostagem(
    atualizada
  );
}

async function excluirPostagem(
  idUsuario,
  idPostagem
) {
  const idUsr =
    validarId(idUsuario);

  const idPost =
    validarId(
      idPostagem,
      "Postagem"
    );

  const postagem =
    await prisma.postagem.findUnique({
      where: {
        id_post: idPost
      }
    });

  if (!postagem) {
    throw erroHttp(
      404,
      "Postagem não encontrada."
    );
  }

  if (
    postagem.id_usr !== idUsr
  ) {
    throw erroHttp(
      403,
      "Você só pode excluir suas próprias postagens."
    );
  }

  await verificarParticipacao(idUsr, postagem.id_for);

  try {
    await prisma.postagem.delete({
      where: {
        id_post: idPost
      }
    });
  } catch (error) {

    if (error.code === "P2003") {
      throw erroHttp(
        409,
        "Esta postagem possui registros relacionados e não pode ser excluída."
      );
    }

    throw error;
  }

  return {
    mensagem:
      "Postagem excluída com sucesso."
  };
}

module.exports = {
  listarPostagens,
  criarPostagem,
  editarPostagem,
  excluirPostagem
};
