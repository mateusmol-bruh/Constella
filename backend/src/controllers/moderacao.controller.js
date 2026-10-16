const moderacaoService =
  require("../services/moderacao.service");

function tratarErro(res, error) {
  if (error.statusCode) {
    return res
      .status(error.statusCode)
      .json({
        mensagem: error.message
      });
  }

  console.error(
    "Erro na API de moderação:",
    error
  );

  return res.status(500).json({
    mensagem:
      "Erro interno do servidor."
  });
}

async function login(req, res) {
  try {
    const { email, senha } =
      req.body || {};

    if (
      typeof email !== "string" ||
      typeof senha !== "string" ||
      !email.trim() ||
      !senha
    ) {
      return res.status(400).json({
        mensagem:
          "E-mail e senha são obrigatórios."
      });
    }

    const resultado =
      await moderacaoService
        .loginModeradora(
          email,
          senha
        );

    if (!resultado) {
      return res.status(401).json({
        mensagem:
          "E-mail ou senha inválidos."
      });
    }

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

async function listar(req, res) {
  try {
    const denuncias =
      await moderacaoService
        .listarDenuncias(
          req.query.status
        );

    return res.status(200).json({
      denuncias
    });

  } catch (error) {
    return tratarErro(
      res,
      error
    );
  }
}

async function buscar(req, res) {
  try {
    const denuncia =
      await moderacaoService
        .buscarDenuncia(
          req.params.id
        );

    return res.status(200).json({
      denuncia
    });

  } catch (error) {
    return tratarErro(
      res,
      error
    );
  }
}

async function atualizarStatus(
  req,
  res
) {
  try {
    const { status } =
      req.body || {};

    const denuncia =
      await moderacaoService
        .atualizarStatus(
          req.moderadoraId,
          req.params.id,
          status
        );

    return res.status(200).json({
      mensagem:
        "Status atualizado com sucesso.",
      denuncia
    });

  } catch (error) {
    return tratarErro(
      res,
      error
    );
  }
}

async function relatorios(
  req,
  res
) {
  try {
    const lista =
      await moderacaoService
        .listarRelatorios(
          req.moderadoraId
        );

    return res.status(200).json({
      relatorios: lista
    });

  } catch (error) {
    return tratarErro(
      res,
      error
    );
  }
}

async function cadastrarConteudo(
  req,
  res
) {
  try {
    const conteudo =
      await moderacaoService
        .criarConteudo(
          req.moderadoraId,
          req.body || {}
        );

    return res.status(201).json({
      mensagem:
        "Conteúdo criado com sucesso.",
      conteudo
    });

  } catch (error) {
    return tratarErro(
      res,
      error
    );
  }
}

async function cadastrarConteudoPro(
  req,
  res
) {
  try {
    const conteudo =
      await moderacaoService
        .criarConteudoPro(
          req.moderadoraId,
          req.body || {}
        );

    return res.status(201).json({
      mensagem:
        "Conteúdo Pro criado com sucesso.",
      conteudo
    });

  } catch (error) {
    return tratarErro(
      res,
      error
    );
  }
}

module.exports = {
  login,
  listar,
  buscar,
  atualizarStatus,
  relatorios,
  cadastrarConteudo,
  cadastrarConteudoPro
};