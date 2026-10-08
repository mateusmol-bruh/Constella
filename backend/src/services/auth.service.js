const prisma = require("../config/prisma");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

async function autenticarUsuaria(email, senha) {
  const usuaria = await prisma.usuaria.findUnique({
    where: {
      email_usr: email.trim().toLowerCase()
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
      email: usuaria.email_usr
    }
  };
}

module.exports = { autenticarUsuaria };
