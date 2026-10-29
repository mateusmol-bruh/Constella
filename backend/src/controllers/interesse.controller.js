const {
  listarInteresses,
  listarInteressesDaUsuaria,
  atualizarInteresses
} = require(
  "../services/interesse.service"
);
const { validarIdsInteresses } = require("../utils/interesses");

async function listar(req, res, next) {
  try {
    const interesses =
      await listarInteresses();

    return res
      .status(200)
      .json(interesses);

  } catch (error) {

    return next(error);
  }
}

async function listarMeus(req, res, next) {
  try {
    const interesses =
      await listarInteressesDaUsuaria(
        req.usuarioId
      );

    return res.status(200).json({
      interesses
    });

  } catch (error) {

    return next(error);
  }
}

async function atualizarMeus(req, res, next) {
  try {
    const { interesses } =
      req.body || {};

    const erro = validarIdsInteresses(interesses);
    if (erro) {
      return res.status(400).json({
        mensagem:
          erro
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

    return next(error);
  }
}

module.exports = {
  listar,
  listarMeus,
  atualizarMeus
};
