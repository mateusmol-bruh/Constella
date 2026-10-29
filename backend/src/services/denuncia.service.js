const prisma = require("../config/prisma");

function erroHttp(statusCode, mensagem) {
  const erro = new Error(mensagem);
  erro.statusCode = statusCode;
  return erro;
}

function validarId(valor, campo = "ID") {
  const texto = String(valor ?? "");

  if (!/^[1-9]\d*$/.test(texto) || texto.length > 19 || BigInt(texto) > 9223372036854775807n) {
    throw erroHttp(400, `${campo} inválido.`);
  }

  return BigInt(texto);
}

function validarMotivo(motivo) {
  if (
    typeof motivo !== "string" ||
    !motivo.trim()
  ) {
    throw erroHttp(
      400,
      "O motivo da denúncia é obrigatório."
    );
  }

  const limpo = motivo.trim();

  if (limpo.length > 255) {
    throw erroHttp(
      400,
      "O motivo deve possuir no máximo 255 caracteres."
    );
  }

  return limpo;
}

async function buscarModeradora() {
  const moderadora =
    await prisma.moderadora.findFirst({
      orderBy: {
        id_mod: "asc"
      }
    });

  if (!moderadora) {
    throw erroHttp(
      500,
      "Nenhuma moderadora cadastrada."
    );
  }

  return moderadora;
}

function formatarDenuncia(denuncia) {
  return {
    id_den: denuncia.id_den.toString(),
    motivo: denuncia.motivo_den,
    status: denuncia.status,
    dt_denuncia: denuncia.dt_denuncia,
    id_moderadora:
      denuncia.id_mod.toString(),
    id_denunciante:
      denuncia.id_usr_denunciante.toString()
  };
}

async function denunciarUsuaria(
  idDenunciante,
  idDenunciada,
  motivo
) {
  const denunciante =
    validarId(idDenunciante);

  const denunciada =
    validarId(
      idDenunciada,
      "Usuária denunciada"
    );

  const motivoLimpo =
    validarMotivo(motivo);

  if (denunciante === denunciada) {
    throw erroHttp(
      400,
      "Você não pode denunciar a própria conta."
    );
  }

  const alvo =
    await prisma.usuaria.findUnique({
      where: {
        id_usr: denunciada
      }
    });

  if (!alvo) {
    throw erroHttp(
      404,
      "Usuária não encontrada."
    );
  }

  const moderadora =
    await buscarModeradora();

  const denuncia =
    await prisma.$transaction(
      async (tx) => {
        const criada =
          await tx.denuncia.create({
            data: {
              motivo_den: motivoLimpo,
              status: "PENDENTE",
              id_mod: moderadora.id_mod,
              id_usr_denunciante:
                denunciante
            }
          });

        await tx.denuncia_usuaria.create({
          data: {
            id_den: criada.id_den,
            id_usr_denunciada:
              denunciada
          }
        });

        return criada;
      }
    );

  return formatarDenuncia(denuncia);
}

async function denunciarPostagem(
  idDenunciante,
  idPostagem,
  motivo
) {
  const denunciante =
    validarId(idDenunciante);

  const idPost =
    validarId(
      idPostagem,
      "Postagem"
    );

  const motivoLimpo =
    validarMotivo(motivo);

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

  if (postagem.id_usr === denunciante) {
    throw erroHttp(
      400,
      "Você não pode denunciar sua própria postagem."
    );
  }

  const participacao = await prisma.usuaria_forum.findUnique({
    where: {
      id_for_id_usr: { id_for: postagem.id_for, id_usr: denunciante }
    }
  });

  if (!participacao) {
    throw erroHttp(403, "Você precisa participar do fórum para denunciar uma postagem.");
  }

  const moderadora =
    await buscarModeradora();

  const denuncia =
    await prisma.$transaction(
      async (tx) => {
        const criada =
          await tx.denuncia.create({
            data: {
              motivo_den: motivoLimpo,
              status: "PENDENTE",
              id_mod: moderadora.id_mod,
              id_usr_denunciante:
                denunciante
            }
          });

        await tx.denuncia_postagem.create({
          data: {
            id_den: criada.id_den,
            id_post: idPost
          }
        });

        return criada;
      }
    );

  return formatarDenuncia(denuncia);
}

async function denunciarMensagem(
  idDenunciante,
  idMensagem,
  motivo
) {
  const denunciante =
    validarId(idDenunciante);

  const idMsg =
    validarId(
      idMensagem,
      "Mensagem"
    );

  const motivoLimpo =
    validarMotivo(motivo);

  const mensagem =
    await prisma.mensagem.findUnique({
      where: {
        id_msg: idMsg
      },

      include: {
        chat: true
      }
    });

  if (!mensagem) {
    throw erroHttp(
      404,
      "Mensagem não encontrada."
    );
  }

  const participa =
    mensagem.chat.id_usr_01 === denunciante ||
    mensagem.chat.id_usr_02 === denunciante;

  if (!participa) {
    throw erroHttp(
      403,
      "Você não participa deste chat."
    );
  }

  if (
    mensagem.id_usr_emissor ===
    denunciante
  ) {
    throw erroHttp(
      400,
      "Você não pode denunciar sua própria mensagem."
    );
  }

  const moderadora =
    await buscarModeradora();

  const denuncia =
    await prisma.$transaction(
      async (tx) => {
        const criada =
          await tx.denuncia.create({
            data: {
              motivo_den: motivoLimpo,
              status: "PENDENTE",
              id_mod: moderadora.id_mod,
              id_usr_denunciante:
                denunciante
            }
          });

        await tx.denuncia_mensagem.create({
          data: {
            id_den: criada.id_den,
            id_msg: idMsg
          }
        });

        return criada;
      }
    );

  return formatarDenuncia(denuncia);
}

async function listarMinhasDenuncias(
  idUsuario
) {
  const idUsr =
    validarId(idUsuario);

  const denuncias =
    await prisma.denuncia.findMany({
      where: {
        id_usr_denunciante: idUsr
      },

      include: {
        denuncia_usuaria: true,
        denuncia_postagem: true,
        denuncia_mensagem: true
      },

      orderBy: {
        dt_denuncia: "desc"
      }
    });

  return denuncias.map(
    (denuncia) => ({
      ...formatarDenuncia(denuncia),

      tipo:
        denuncia.denuncia_usuaria.length
          ? "USUARIA"
          : denuncia.denuncia_postagem.length
            ? "POSTAGEM"
            : denuncia.denuncia_mensagem.length
              ? "MENSAGEM"
              : "DESCONHECIDO"
    })
  );
}

module.exports = {
  denunciarUsuaria,
  denunciarPostagem,
  denunciarMensagem,
  listarMinhasDenuncias
};
