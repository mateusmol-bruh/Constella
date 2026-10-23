const prisma = require("../config/prisma");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { camposOnboarding, estadoOnboarding } = require("../utils/onboarding");

async function autenticarUsuaria(email, senha) {
  const usuaria = await prisma.usuaria.findUnique({
    where: {
      email_usr: email.trim().toLowerCase()
    },
    select: {
      id_usr: true, nome_usr: true, email_usr: true, senha_usr: true,
      status_verificacao: true, ...camposOnboarding()
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

  const token = jwt.sign(
    {
      sub: String(usuaria.id_usr),
      tipo: "usuaria"
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "1h",
      algorithm: "HS256",
      issuer: "constella",
      audience: "constella-app"
    }
  );

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
