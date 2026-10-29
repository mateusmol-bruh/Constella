const prisma = require("../config/prisma");
const bcrypt = require("bcryptjs");
const { emitirSessao } = require("./sessao.service");
const { camposOnboarding, estadoOnboarding } = require("../utils/onboarding");

async function autenticarUsuaria(email, senha) {
  const usuaria = await prisma.usuaria.findUnique({
    where: {
      email_usr: email.trim().toLowerCase()
    },
    select: {
      id_usr: true, nome_usr: true, email_usr: true, senha_usr: true,
      status_verificacao: true, banida: true, ...camposOnboarding()
    }
  });

  if (!usuaria) {
    return null;
  }

  const senhaValida = await bcrypt.compare(
    senha,
    usuaria.senha_usr
  );

  if (!senhaValida) {
    return null;
  }

  if (usuaria.banida) throw Object.assign(new Error('Sua conta está banida. Entre em contato com a moderação.'), { statusCode:403, codigo:'CONTA_BANIDA' });
  const token = await emitirSessao("usuaria", usuaria.id_usr);

  return {
    mensagem: "Login realizado com sucesso",
    token,
    usuaria: {
      id: String(usuaria.id_usr),
      nome: usuaria.nome_usr,
      email: usuaria.email_usr,
      status_verificacao: usuaria.status_verificacao,
      ...estadoOnboarding(usuaria)
    }
  };
}

module.exports = { autenticarUsuaria };
