const prisma = require("../config/prisma");

async function buscarPerfil(idUsuario) {
  const usuaria = await prisma.usuaria.findUnique({
    where: {
      id_usr: BigInt(idUsuario)
    },

    select: {
      id_usr: true,
      nome_usr: true,
      email_usr: true,
      foto_usr: true,
      cpf_usr: true,
      status_verificacao: true,

      usuaria_interesses: {
        include: {
          interesses: true
        }
      }
    }
  });

  if (!usuaria) {
    return null;
  }

  return {
    id_usr: usuaria.id_usr.toString(),
    nome_usr: usuaria.nome_usr,
    email_usr: usuaria.email_usr,
    foto_usr: usuaria.foto_usr,
    cpf_usr: usuaria.cpf_usr,
    status_verificacao: usuaria.status_verificacao,

    interesses: usuaria.usuaria_interesses.map((item) => ({
      id_intr: item.interesses.id_intr.toString(),
      nome_intr: item.interesses.nome_intr
    }))
  };
}

async function atualizarPerfil(idUsuario, dados) {
  const dadosAtualizacao = {};

  if (dados.nome !== undefined) {
    dadosAtualizacao.nome_usr = dados.nome.trim();
  }

  if (dados.email !== undefined) {
    dadosAtualizacao.email_usr =
      dados.email.trim().toLowerCase();
  }

  if (dados.foto !== undefined) {
    dadosAtualizacao.foto_usr =
      dados.foto === null
        ? null
        : dados.foto.trim();
  }

  const usuaria = await prisma.usuaria.update({
    where: {
      id_usr: BigInt(idUsuario)
    },

    data: dadosAtualizacao,

    select: {
      id_usr: true,
      nome_usr: true,
      email_usr: true,
      foto_usr: true,
      status_verificacao: true
    }
  });

  return {
    ...usuaria,
    id_usr: usuaria.id_usr.toString()
  };
}

module.exports = {
  buscarPerfil,
  atualizarPerfil
};