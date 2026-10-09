const conexaoService = require("../services/conexao.service");

// Tratamento dos erros
function tratarErro(res, error) {
  if (error.statusCode) {
    return res.status(error.statusCode).json({
      mensagem: error.message
    });
  }

  console.error("Erro na API de conexões:", error);

  return res.status(500).json({
    mensagem: "Erro interno do servidor."
  });
}

// Enviar solicitação
async function enviar(req, res) {
  try {
    const conexao =
      await conexaoService.enviarSolicitacao(
        req.usuarioId,
        req.params.id
      );

    return res.status(201).json({
      mensagem: "Solicitação enviada com sucesso.",
      conexao
    });

  } catch (error) {
    return tratarErro(res, error);
  }
}

// Listar solicitações recebidas
async function recebidas(req, res) {
  try {
    const solicitacoes =
      await conexaoService.listarRecebidas(
        req.usuarioId
      );

    return res.status(200).json({
      solicitacoes
    });

  } catch (error) {
    return tratarErro(res, error);
  }
}

// Listar solicitações enviadas
async function enviadas(req, res) {
  try {
    const solicitacoes =
      await conexaoService.listarEnviadas(
        req.usuarioId
      );

    return res.status(200).json({
      solicitacoes
    });

  } catch (error) {
    return tratarErro(res, error);
  }
}

// Listar conexões aceitas
async function listar(req, res) {
  try {
    const conexoes =
      await conexaoService.listarAceitas(
        req.usuarioId
      );

    return res.status(200).json({
      conexoes
    });

  } catch (error) {
    return tratarErro(res, error);
  }
}

// Aceitar solicitação
async function aceitar(req, res) {
  try {
    const conexao =
      await conexaoService.responderSolicitacao(
        req.usuarioId,
        req.params.id,
        "ACEITO"
      );

    return res.status(200).json({
      mensagem: "Solicitação aceita com sucesso.",
      conexao
    });

  } catch (error) {
    return tratarErro(res, error);
  }
}

// Recusar solicitação
async function recusar(req, res) {
  try {
    const conexao =
      await conexaoService.responderSolicitacao(
        req.usuarioId,
        req.params.id,
        "RECUSADO"
      );

    return res.status(200).json({
      mensagem: "Solicitação recusada.",
      conexao
    });

  } catch (error) {
    return tratarErro(res, error);
  }
}

module.exports = {
  enviar,
  recebidas,
  enviadas,
  listar,
  aceitar,
  recusar
};
