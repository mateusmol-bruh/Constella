const forumService =
  require("../services/forum.service");

function tratarErro(res, error) {
  if (error.statusCode) {
    return res
      .status(error.statusCode)
      .json({
        mensagem: error.message,
        ...(error.codigo ? { codigo: error.codigo } : {})
      });
  }

  console.error(
    "Erro na API de fóruns:",
    error.code || error.name || 'Error'
  );

  return res.status(500).json({
    mensagem:
      "Erro interno do servidor."
  });
}

async function listar(req, res) {
  try {
    const paginated = req.query.pagina !== undefined;
    const pagina = Number(req.query.pagina ?? 1), limite = Number(req.query.limite ?? 30);
    const foruns =
      await forumService.listarForuns(
        req.usuarioId, req.query.filtro, paginated ? { pagina, limite, busca: typeof req.query.busca === 'string' ? req.query.busca.trim() : '' } : undefined
      );

    return res.status(200).json({
      foruns: paginated ? foruns.slice(0, limite) : foruns,
      ...(paginated ? { pagina, tem_mais: foruns.length > limite } : {})
    });
  } catch (error) {
    return tratarErro(res, error);
  }
}

async function meus(req, res) {
  try {
    const foruns =
      await forumService.listarMeusForuns(
        req.usuarioId
      );

    return res.status(200).json({
      foruns
    });
  } catch (error) {
    return tratarErro(res, error);
  }
}

async function buscar(req, res) {
  try {
    const forum =
      await forumService.buscarForum(
        req.usuarioId,
        req.params.id
      );

    return res.status(200).json({
      forum
    });
  } catch (error) {
    return tratarErro(res, error);
  }
}

async function criar(req, res) {
  try {
    const forum =
      await forumService.criarForum(
        req.usuarioId,
        req.body || {}
      );

    return res.status(201).json({
      mensagem:
        "Fórum criado com sucesso.",
      forum
    });
  } catch (error) {
    return tratarErro(res, error);
  }
}

async function editar(req, res) {
  try {
    const forum =
      await forumService.editarForum(
        req.usuarioId,
        req.params.id,
        req.body || {}
      );

    return res.status(200).json({
      mensagem:
        "Fórum atualizado com sucesso.",
      forum
    });
  } catch (error) {
    return tratarErro(res, error);
  }
}

async function entrar(req, res) {
  try {
    const resultado =
      await forumService.entrarForum(
        req.usuarioId,
        req.params.id
      );

    return res
      .status(201)
      .json(resultado);
  } catch (error) {
    return tratarErro(res, error);
  }
}

async function sair(req, res) {
  try {
    const resultado =
      await forumService.sairForum(
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

async function excluir(req, res) {
  try {
    const resultado =
      await forumService.excluirForum(
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

module.exports = {
  limites: async (req, res, next) => {
    try { res.json(await forumService.limitesCriacao(req.usuarioId)); }
    catch (error) { next(error); }
  },
  listar,
  meus,
  buscar,
  criar,
  editar,
  entrar,
  sair,
  excluir
};
