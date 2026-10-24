const postagemService =
  require("../services/postagem.service");
const { responderErroConversa } = require('../utils/conversation-error');

function tratarErro(res, error) {
  return responderErroConversa(res, error, 'postagem');
}

async function listar(req, res) {
  try {
    const pagina = Number(req.query.pagina ?? 1);
    const limite = Number(req.query.limite ?? 50);
    const postagens =
      await postagemService
        .listarPostagens(
          req.usuarioId,
          req.params.id,
          pagina,
          limite
        );

    return res.status(200).json({
      pagina,
      limite,
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
