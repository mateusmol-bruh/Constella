const prisma =
  require("../config/prisma");

const bcrypt =
  require("bcryptjs");

const jwt =
  require("jsonwebtoken");

function erroHttp(statusCode, mensagem) {
  const erro = new Error(mensagem);
  erro.statusCode = statusCode;
  return erro;
}

function validarId(valor) {
  if (
    !/^[1-9]\d*$/.test(
      String(valor ?? "")
    )
  ) {
    throw erroHttp(
      400,
      "ID inválido."
    );
  }

  return BigInt(valor);
}

async function loginModeradora(
  email,
  senha
) {
  const moderadora =
    await prisma.moderadora.findUnique({
      where: {
        email_mod:
          email.trim().toLowerCase()
      }
    });

  if (!moderadora) {
    return null;
  }

  const senhaValida =
    await bcrypt.compare(
      senha,
      moderadora.senha_mod
    );

  if (!senhaValida) {
    return null;
  }

  const token = jwt.sign(
    {
      sub:
        moderadora.id_mod.toString(),

      tipo: "moderadora"
    },

    process.env.JWT_SECRET,

    {
      expiresIn: "1h",
      issuer: "constella",
      audience: "constella-app"
    }
  );

  return {
    token,

    moderadora: {
      id:
        moderadora.id_mod.toString(),

      nome:
        moderadora.nome_mod,

      email:
        moderadora.email_mod
    }
  };
}

async function listarDenuncias(status) {
  const where = {};

  if (status) {
    const valido = [
      "PENDENTE",
      "EM_ANALISE",
      "RESOLVIDA",
      "REJEITADA"
    ].includes(status);

    if (!valido) {
      throw erroHttp(
        400,
        "Status inválido."
      );
    }

    where.status = status;
  }

  const denuncias =
    await prisma.denuncia.findMany({
      where,

      include: {
        usuaria: {
          select: {
            id_usr: true,
            nome_usr: true,
            email_usr: true
          }
        },

        denuncia_usuaria: {
          include: {
            usuaria: {
              select: {
                id_usr: true,
                nome_usr: true
              }
            }
          }
        },

        denuncia_postagem: {
          include: {
            postagem: true
          }
        },

        denuncia_mensagem: {
          include: {
            mensagem: true
          }
        }
      },

      orderBy: {
        dt_denuncia: "desc"
      }
    });

  return denuncias.map(
    formatarDenunciaModeracao
  );
}

function formatarDenunciaModeracao(
  denuncia
) {
  let tipo = null;
  let alvo = null;

  if (
    denuncia.denuncia_usuaria
      .length
  ) {
    tipo = "USUARIA";

    const registro =
      denuncia.denuncia_usuaria[0];

    alvo = {
      id:
        registro.id_usr_denunciada
          .toString(),

      nome:
        registro.usuaria?.nome_usr
    };
  }

  if (
    denuncia.denuncia_postagem
      .length
  ) {
    tipo = "POSTAGEM";

    const registro =
      denuncia.denuncia_postagem[0];

    alvo = {
      id:
        registro.id_post.toString(),

      conteudo:
        registro.postagem?.cont_post
    };
  }

  if (
    denuncia.denuncia_mensagem
      .length
  ) {
    tipo = "MENSAGEM";

    const registro =
      denuncia.denuncia_mensagem[0];

    alvo = {
      id:
        registro.id_msg.toString(),

      conteudo:
        registro.mensagem?.cont_msg
    };
  }

  return {
    id:
      denuncia.id_den.toString(),

    motivo:
      denuncia.motivo_den,

    status:
      denuncia.status,

    data:
      denuncia.dt_denuncia,

    denunciante: {
      id:
        denuncia.usuaria.id_usr
          .toString(),

      nome:
        denuncia.usuaria.nome_usr,

      email:
        denuncia.usuaria.email_usr
    },

    tipo,
    alvo
  };
}

async function buscarDenuncia(id) {
  const idDen =
    validarId(id);

  const denuncias =
    await prisma.denuncia.findMany({
      where: {
        id_den: idDen
      },

      include: {
        usuaria: {
          select: {
            id_usr: true,
            nome_usr: true,
            email_usr: true
          }
        },

        denuncia_usuaria: {
          include: {
            usuaria: true
          }
        },

        denuncia_postagem: {
          include: {
            postagem: true
          }
        },

        denuncia_mensagem: {
          include: {
            mensagem: true
          }
        }
      }
    });

  if (!denuncias.length) {
    throw erroHttp(
      404,
      "Denúncia não encontrada."
    );
  }

  return formatarDenunciaModeracao(
    denuncias[0]
  );
}

async function atualizarStatus(
  idModeradora,
  idDenuncia,
  status
) {
  const idMod =
    validarId(idModeradora);

  const idDen =
    validarId(idDenuncia);

  const permitidos = [
    "PENDENTE",
    "EM_ANALISE",
    "RESOLVIDA",
    "REJEITADA"
  ];

  if (!permitidos.includes(status)) {
    throw erroHttp(
      400,
      "Status inválido."
    );
  }

  const denuncia =
    await prisma.denuncia.findUnique({
      where: {
        id_den: idDen
      }
    });

  if (!denuncia) {
    throw erroHttp(
      404,
      "Denúncia não encontrada."
    );
  }

  const atualizada =
    await prisma.$transaction(
      async (tx) => {
        const resultado =
          await tx.denuncia.update({
            where: {
              id_den: idDen
            },

            data: {
              status,
              id_mod: idMod
            }
          });

        await tx.relatorio_moderacao.create({
          data: {
            id_mod: idMod,

            acao:
              `ALTERACAO_STATUS_DENUNCIA`,

            dt_acao: new Date(),

            desc:
              `Denúncia ${idDen.toString()} alterada para ${status}.`
          }
        });

        return resultado;
      }
    );

  return {
    id:
      atualizada.id_den.toString(),

    status:
      atualizada.status
  };
}

async function listarRelatorios(
  idModeradora
) {
  const idMod =
    validarId(idModeradora);

  const relatorios =
    await prisma.relatorio_moderacao
      .findMany({
        where: {
          id_mod: idMod
        },

        orderBy: {
          dt_acao: "desc"
        }
      });

  return relatorios.map(
    (relatorio) => ({
      id:
        relatorio.id_relat.toString(),

      acao:
        relatorio.acao,

      descricao:
        relatorio.desc,

      data:
        relatorio.dt_acao
    })
  );
}

module.exports = {
  loginModeradora,
  listarDenuncias,
  buscarDenuncia,
  atualizarStatus,
  listarRelatorios
};