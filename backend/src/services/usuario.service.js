const prisma = require("../config/prisma");

function erroHttp(mensagem, statusCode) {
  const erro = new Error(mensagem);
  erro.statusCode = statusCode;
  return erro;
}

function validarId(valor) {
  const texto = String(valor ?? "");

  if (!/^[1-9]\d*$/.test(texto)) {
    throw erroHttp("ID inválido.", 400);
  }

  return BigInt(texto);
}

function formatarUsuaria(usuaria) {
  return {
    id: usuaria.id_usr.toString(),
    nome: usuaria.nome_usr,
    foto: usuaria.foto_usr,
    status_verificacao: usuaria.status_verificacao,

    interesses:
      usuaria.usuaria_interesses?.map((item) => ({
        id: item.interesses.id_intr.toString(),
        nome: item.interesses.nome_intr
      })) || []
  };
}

async function listarUsuarias(idUsuario, busca) {
  const idAtual = validarId(idUsuario);

  const where = {
    id_usr: {
      not: idAtual
    }
  };

  if (
    typeof busca === "string" &&
    busca.trim()
  ) {
    where.nome_usr = {
      contains: busca.trim(),
      mode: "insensitive"
    };
  }

  const usuarias =
    await prisma.usuaria.findMany({
      where,

      select: {
        id_usr: true,
        nome_usr: true,
        foto_usr: true,
        status_verificacao: true,

        usuaria_interesses: {
          include: {
            interesses: true
          }
        }
      },

      orderBy: {
        nome_usr: "asc"
      },

      take: 100
    });

  return usuarias.map(formatarUsuaria);
}

async function buscarUsuariaPorId(
  idUsuarioLogado,
  idDestino
) {
  const idAtual =
    validarId(idUsuarioLogado);

  const id = validarId(idDestino);

  if (id === idAtual) {
    throw erroHttp(
      "Para consultar seu próprio perfil, use /api/perfil.",
      400
    );
  }

  const usuaria =
    await prisma.usuaria.findUnique({
      where: {
        id_usr: id
      },

      select: {
        id_usr: true,
        nome_usr: true,
        foto_usr: true,
        status_verificacao: true,

        usuaria_interesses: {
          include: {
            interesses: true
          }
        }
      }
    });

  if (!usuaria) {
    throw erroHttp(
      "Usuária não encontrada.",
      404
    );
  }

  const conexao =
    await prisma.conexao.findFirst({
      where: {
        OR: [
          {
            id_user_solicit: idAtual,
            id_user_receb: id
          },
          {
            id_user_solicit: id,
            id_user_receb: idAtual
          }
        ]
      }
    });

  return {
    ...formatarUsuaria(usuaria),

    conexao: conexao
      ? {
          id: conexao.id_conexao.toString(),
          status: conexao.status_conexao,

          enviada_por_mim:
            conexao.id_user_solicit ===
            idAtual
        }
      : null
  };
}

module.exports = {
  listarUsuarias,
  buscarUsuariaPorId
};