const {
  autenticarUsuaria
} = require("../services/auth.service");

async function login(req, res, next) {
  const { email, senha } = req.body || {};

  if (
    typeof email !== "string" ||
    typeof senha !== "string" ||
    !email.trim() ||
    !senha ||
    email.trim().length > 255 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
    Buffer.byteLength(senha, "utf8") > 72
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
  } catch (error) {
  return next(error);
}
}

module.exports = { login };
