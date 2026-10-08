const {
  autenticarUsuaria
} = require("../services/auth.service");

async function login(req, res) {
  const { email, senha } = req.body || {};

  if (
    typeof email !== "string" ||
    typeof senha !== "string" ||
    !email.trim() ||
    !senha
  ) {
    return res.status(400).json({
      mensagem: "Email e senha são obrigatórios"
    });
  }

  try {
    const resultado = await autenticarUsuaria(
      email,
      senha
    );

    if (!resultado) {
      return res.status(401).json({
        mensagem: "Email ou senha inválidos"
      });
    }

    return res.status(200).json(resultado);
  } catch (erro) {
    console.error("Erro interno no login");

    return res.status(500).json({
      mensagem: "Erro interno do servidor"
    });
  }
}

module.exports = { login };
