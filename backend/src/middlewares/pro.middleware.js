const prisma = require("../config/prisma");

async function exigirPro(req, res, next) {
  try {
    const idUsr = BigInt(req.usuarioId);

    const assinatura =
      await prisma.assinatura.findUnique({
        where: {
          id_usr: idUsr
        }
      });

    if (!assinatura) {
      return res.status(403).json({
        mensagem:
          "Esta funcionalidade é exclusiva para assinantes Pro."
      });
    }

    req.assinatura = assinatura;

    next();

  } catch (error) {
    console.error(
      "Erro ao verificar assinatura Pro:",
      error
    );

    return res.status(500).json({
      mensagem:
        "Erro interno do servidor."
    });
  }
}

module.exports = exigirPro;