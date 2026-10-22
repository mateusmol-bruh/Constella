const conteudoService =
  require("../services/conteudo.service");

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
    "Erro na API de conteúdos:",
    error
  );

  return res.status(500).json({
    mensagem:
      "Erro interno do servidor."
  });
}

async function listar(req, res) {
  try {
    const conteudos =
      await conteudoService
        .listarConteudos();

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
      await conteudoService
        .buscarConteudo(
          req.params.id
        );

    return res.status(200).json({
      conteudo
    });
  } catch (error) {
    return tratarErro(res, error);
  }
}

async function acesso(req, res) {
  try {
    const resultado =
      await conteudoService
        .registrarAcesso(
          req.usuarioId,
          req.params.id
        );

    return res
      .status(200)
      .json(resultado);

  } catch (error) {
    return tratarErro(res, error);
  }
}

async function progresso(req, res) {
  try {
    const resultado =
      await conteudoService
        .atualizarProgresso(
          req.usuarioId,
          req.params.id,
          req.body?.progresso
        );

    return res.status(200).json({
      mensagem:
        "Progresso atualizado com sucesso.",

      conteudo:
        resultado
    });

  } catch (error) {
    return tratarErro(res, error);
  }
}

module.exports = {
  listar,
  buscar,
  acesso,
  progresso
};