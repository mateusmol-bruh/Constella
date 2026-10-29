const jwt = require("jsonwebtoken");

function autenticar(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      mensagem: "Token não informado."
    });
  }

  const partes = authHeader.split(" ");
  const [tipo, token] = partes;

  if (tipo !== "Bearer" || !token || partes.length !== 2) {
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
        audience: "constella-app",
        algorithms: ["HS256"]
      }
    );

    if (payload.tipo !== "usuaria") {
      return res.status(403).json({
        mensagem: "Acesso não autorizado."
      });
    }

    if (typeof payload.sub !== "string" || !/^[1-9]\d{0,18}$/.test(payload.sub) ||
        BigInt(payload.sub) > 9223372036854775807n ||
        typeof payload.exp !== "number" || typeof payload.iat !== "number") {
      return res.status(401).json({ mensagem: "Token inválido ou expirado." });
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
