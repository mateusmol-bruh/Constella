const prisma = require('../config/prisma');
const bcrypt = require('bcryptjs');
const { emitirSessao } = require('./sessao.service');
const { camposOnboarding } = require('../utils/onboarding');
async function cadastrarUsuaria({ nome, email, senha, cpf }) {
  const hash = await bcrypt.hash(senha, 12);
  return prisma.$transaction(async (tx) => {
    const usuaria = await tx.usuaria.create({
      data: {
        nome_usr: nome,
        email_usr: email,
        senha_usr: hash,
        cpf_usr: cpf,
        foto_usr: null,
        status_verificacao: false,
      },
      select: {
        id_usr: true,
        nome_usr: true,
        email_usr: true,
        status_verificacao: true,
        ...camposOnboarding(),
      },
    });
    return { usuaria, token: await emitirSessao('usuaria', usuaria.id_usr, tx) };
  });
}
module.exports = { cadastrarUsuaria };
