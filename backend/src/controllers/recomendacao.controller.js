const recomendacaoService =
  require(
    "../services/recomendacao.service"
  );

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
    "Erro nas recomendações:",
    error
  );

  return res.status(500).json({
    mensagem:
      "Erro interno do servidor."
  });
}

async function usuarios(req, res) {
  try {
    const recomendacoes =
      await recomendacaoService
        .recomendarUsuarias(
          req.usuarioId
        );

    return res.status(200).json({
      recomendacoes
    });

  } catch (error) {
    return tratarErro(
      res,
      error
    );
  }
}

async function conteudos(req, res) {
  try {
    const recomendacoes =
      await recomendacaoService
        .recomendarConteudos(
          req.usuarioId
        );

    return res.status(200).json({
      recomendacoes
    });

  } catch (error) {
    return tratarErro(
      res,
      error
    );
  }
}

async function foruns(req, res) {
  try {
    const recomendacoes =
      await recomendacaoService
        .recomendarForuns(
          req.usuarioId
        );

    return res.status(200).json({
      recomendacoes
    });

  } catch (error) {
    return tratarErro(
      res,
      error
    );
  }
}

module.exports = {
  usuarios,
  conteudos,
  foruns
};