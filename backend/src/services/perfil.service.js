const prisma = require("../config/prisma");
const { camposOnboarding, estadoOnboarding, exigirOnboardingDisponivel } = require("../utils/onboarding");

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
      status_verificacao: true,
      ...camposOnboarding(),

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
    status_verificacao: usuaria.status_verificacao,
    ...estadoOnboarding(usuaria),

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

  if (dados.apresentacao !== undefined) {
    exigirOnboardingDisponivel();
    dadosAtualizacao.apresentacao = dados.apresentacao.trim();
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
      status_verificacao: true,
      ...camposOnboarding()
    }
  });

  return {
    ...usuaria,
    id_usr: usuaria.id_usr.toString(),
    ...estadoOnboarding(usuaria)
  };
}

async function concluirOnboarding(idUsuario, { apresentacao, interesses }) {
  exigirOnboardingDisponivel();
  const idUsr = BigInt(idUsuario);
  const ids = interesses.map((id) => BigInt(id));

  // O estado só muda junto com a apresentação e interesses, inclusive seleção vazia.
  await prisma.$transaction(async (tx) => {
    const existentes = await tx.interesses.findMany({
      where: { id_intr: { in: ids } }, select: { id_intr: true }
    });
    if (existentes.length !== ids.length) {
      const erro = new Error("Um ou mais interesses não existem.");
      erro.statusCode = 400;
      throw erro;
    }
    await tx.usuaria_interesses.deleteMany({ where: { id_usr: idUsr } });
    if (ids.length) {
      await tx.usuaria_interesses.createMany({
        data: ids.map((id_intr) => ({ id_usr: idUsr, id_intr }))
      });
    }
    await tx.usuaria.update({
      where: { id_usr: idUsr },
      data: { apresentacao: apresentacao.trim(), onboarding_concluido: true },
      select: { id_usr: true }
    });
  });
  return buscarPerfil(idUsuario);
}

module.exports = {
  buscarPerfil,
  atualizarPerfil,
  concluirOnboarding
};
