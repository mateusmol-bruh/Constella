const {
  listarInteresses,
  listarInteressesDaUsuaria,
  atualizarInteresses
} = require(
  "../services/interesse.service"
);

async function listar(req, res) {
  try {
    const interesses =
      await listarInteresses();

    return res
      .status(200)
      .json(interesses);

  } catch (error) {

    console.error(
      "Erro ao listar interesses:",
      error
    );

    return res.status(500).json({
      mensagem:
        "Erro interno do servidor."
    });
  }
}

async function listarMeus(req, res) {
  try {
    const interesses =
      await listarInteressesDaUsuaria(
        req.usuarioId
      );

    return res.status(200).json({
      interesses
    });

  } catch (error) {

    console.error(
      "Erro ao listar interesses da usuária:",
      error
    );

    return res.status(500).json({
      mensagem:
        "Erro interno do servidor."
    });
  }
}

async function atualizarMeus(req, res) {
  try {
    const { interesses } =
      req.body || {};

    if (!Array.isArray(interesses)) {
      return res.status(400).json({
        mensagem:
          'O campo "interesses" deve ser um array.'
      });
    }

    const resultado =
      await atualizarInteresses(
        req.usuarioId,
        interesses
      );

    return res.status(200).json({
      mensagem:
        "Interesses atualizados com sucesso.",

      interesses: resultado
    });

  } catch (error) {

    if (
      error.codigo ===
      "INTERESSE_INVALIDO"
    ) {
      return res.status(400).json({
        mensagem: error.message
      });
    }

    console.error(
      "Erro ao atualizar interesses:",
      error
    );

    return res.status(500).json({
      mensagem:
        "Erro interno do servidor."
    });
  }
}

module.exports = {
  listar,
  listarMeus,
  atualizarMeus
};