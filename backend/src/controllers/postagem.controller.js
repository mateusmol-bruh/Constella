const postagemService =
  require("../services/postagem.service");

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
    "Erro na API de postagens:",
    error
  );

  return res.status(500).json({
    mensagem:
      "Erro interno do servidor."
  });
}

async function listar(req, res) {
  try {
    const postagens =
      await postagemService
        .listarPostagens(
          req.usuarioId,
          req.params.id
        );

    return res.status(200).json({
      postagens
    });
  } catch (error) {
    return tratarErro(
      res,
      error
    );
  }
}

async function criar(req, res) {
  try {
    const postagem =
      await postagemService
        .criarPostagem(
          req.usuarioId,
          req.params.id,
          req.body || {}
        );

    return res.status(201).json({
      mensagem:
        "Postagem criada com sucesso.",

      postagem
    });
  } catch (error) {
    return tratarErro(
      res,
      error
    );
  }
}

async function editar(req, res) {
  try {
    const postagem =
      await postagemService
        .editarPostagem(
          req.usuarioId,
          req.params.id,
          req.body || {}
        );

    return res.status(200).json({
      mensagem:
        "Postagem atualizada com sucesso.",

      postagem
    });
  } catch (error) {
    return tratarErro(
      res,
      error
    );
  }
}

async function excluir(req, res) {
  try {
    const resultado =
      await postagemService
        .excluirPostagem(
          req.usuarioId,
          req.params.id
        );

    return res
      .status(200)
      .json(resultado);
  } catch (error) {
    return tratarErro(
      res,
      error
    );
  }
}

module.exports = {
  listar,
  criar,
  editar,
  excluir
};