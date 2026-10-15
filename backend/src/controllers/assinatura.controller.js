const assinaturaService =
  require("../services/assinatura.service");

function tratarErro(res, error) {
  if (error.statusCode) {
    return res
      .status(error.statusCode)
      .json({
        mensagem:
          error.message
      });
  }

  console.error(
    "Erro na API de assinatura:",
    error
  );

  return res.status(500).json({
    mensagem:
      "Erro interno do servidor."
  });
}

async function buscar(req, res) {
  try {
    const assinatura =
      await assinaturaService
        .buscarAssinatura(
          req.usuarioId
        );

    return res.status(200).json({
      pro: Boolean(assinatura),
      assinatura
    });

  } catch (error) {
    return tratarErro(res, error);
  }
}

async function criar(req, res) {
  try {
    const assinatura =
      await assinaturaService
        .criarAssinatura(
          req.usuarioId,
          req.body || {}
        );

    return res.status(201).json({
      mensagem:
        "Assinatura criada com sucesso.",

      assinatura
    });

  } catch (error) {
    return tratarErro(res, error);
  }
}

async function cancelar(req, res) {
  try {
    const resultado =
      await assinaturaService
        .cancelarAssinatura(
          req.usuarioId
        );

    return res
      .status(200)
      .json(resultado);

  } catch (error) {
    return tratarErro(res, error);
  }
}

module.exports = {
  buscar,
  criar,
  cancelar
};