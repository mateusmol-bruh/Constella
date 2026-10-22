const usuarioService =
  require("../services/usuario.service");

function tratarErro(res, error) {
  if (error.statusCode) {
    return res
      .status(error.statusCode)
      .json({
        mensagem: error.message
      });
  }

  console.error(
    "Erro na API de usuárias:",
    error
  );

  return res.status(500).json({
    mensagem:
      "Erro interno do servidor."
  });
}

async function listar(req, res) {
  try {
    const usuarias =
      await usuarioService.listarUsuarias(
        req.usuarioId,
        req.query.busca
      );

    return res.status(200).json({
      usuarias
    });
  } catch (error) {
    return tratarErro(res, error);
  }
}

async function buscarPorId(req, res) {
  try {
    const usuaria =
      await usuarioService.buscarUsuariaPorId(
        req.usuarioId,
        req.params.id
      );

    return res.status(200).json({
      usuaria
    });
  } catch (error) {
    return tratarErro(res, error);
  }
}

module.exports = {
  listar,
  buscarPorId
};