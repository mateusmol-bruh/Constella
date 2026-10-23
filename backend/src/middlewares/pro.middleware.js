const { buscarStatusAssinatura } = require("../services/assinatura.service");

async function exigirPro(req, res, next) {
  try {
    const status = await buscarStatusAssinatura(req.usuarioId);

    // A decisão de acesso pertence ao servidor. Um registro legado, um
    // booleano do cliente ou uma transação ainda pendente não concedem acesso.
    if (status.ativo !== true) {
      return res.status(403).json({
        codigo: "PRO_NAO_VALIDADO",
        mensagem: "Este conteúdo exige uma assinatura Pro validada. A contratação está indisponível enquanto o provedor não for configurado."
      });
    }

    req.assinatura = status.assinatura;
    if (status.demonstracao) res.set('X-Constella-Demo', 'true');
    return next();
  } catch (error) {
    return res.status(error.statusCode || 503).json({
      mensagem: error.statusCode ? error.message : "Não foi possível verificar o acesso Pro. Tente novamente."
    });
  }
}

module.exports = exigirPro;
