const proService =
  require("../services/pro.service");

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
    "Erro na API Pro:",
    error
  );

  return res.status(500).json({
    mensagem:
      "Erro interno do servidor."
  });
}

async function status(req, res) {
  try {
    const resultado =
      await proService
        .verificarStatusPro(
          req.usuarioId
        );

    return res
      .status(200)
      .json(resultado);

  } catch (error) {
    return tratarErro(res, error);
  }
}

async function listar(req, res) {
  try {
    const conteudos =
      await proService
        .listarConteudosPro();

    return res.status(200).json({
      conteudos
    });

  } catch (error) {
    return tratarErro(res, error);
  }
}

async function buscar(req, res) {
  try {
    const conteudo =
      await proService
        .buscarConteudoPro(
          req.params.id
        );

    return res.status(200).json({
      conteudo
    });

  } catch (error) {
    return tratarErro(res, error);
  }
}

module.exports = {
  status,
  listar,
  buscar
};