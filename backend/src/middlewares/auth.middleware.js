const jwt = require("jsonwebtoken");

function autenticar(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      mensagem: "Token não informado."
    });
  }

  const [tipo, token] = authHeader.split(" ");

  if (tipo !== "Bearer" || !token) {
    return res.status(401).json({
      mensagem: "Token inválido."
    });
  }

  try {
    const payload = jwt.verify(
      token,
      process.env.JWT_SECRET,
      {
        issuer: "constella",
        audience: "constella-app"
      }
    );

    if (payload.tipo !== "usuaria") {
      return res.status(403).json({
        mensagem: "Acesso não autorizado."
      });
    }

    req.usuarioId = payload.sub;

    next();

  } catch (error) {
    return res.status(401).json({
      mensagem: "Token inválido ou expirado."
    });
  }
}

module.exports = autenticar;