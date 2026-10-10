
const chatService = require("../services/chat.service");

function tratarErro(res, error) {
  if (error.statusCode) {
    return res.status(error.statusCode).json({
      mensagem: error.message
    });
  }

  if (error.code === "P2025") {
    return res.status(404).json({
      mensagem: "Registro não encontrado."
    });
  }

  if (error.code === "P2003") {
    return res.status(400).json({
      mensagem: "Referência inválida no banco de dados."
    });
  }

  console.error("Erro na API de chat:", error);

  return res.status(500).json({
    mensagem: "Erro interno do servidor."
  });
}

// Criar ou recuperar conversa
async function criarChat(req, res) {
  try {
    const { id_destinataria } = req.body || {};

    if (id_destinataria === undefined) {
      return res.status(400).json({
        mensagem: "Informe a destinatária."
      });
    }

    const resultado = await chatService.criarOuBuscarChat(
      req.usuarioId,
      id_destinataria
    );

    return res.status(resultado.criado ? 201 : 200).json({
      mensagem: resultado.criado
        ? "Chat criado com sucesso."
        : "Chat encontrado com sucesso.",
      chat: resultado.chat
    });
  } catch (error) {
    return tratarErro(res, error);
  }
}

// Listar conversas
async function listarChats(req, res) {
  try {
    const chats = await chatService.listarChats(req.usuarioId);

    return res.status(200).json({
      chats
    });
  } catch (error) {
    return tratarErro(res, error);
  }
}

// Buscar uma conversa
async function buscarChat(req, res) {
  try {
    const chat = await chatService.buscarChat(
      req.usuarioId,
      req.params.id
    );

    return res.status(200).json({ chat });
  } catch (error) {
    return tratarErro(res, error);
  }
}

// Listar mensagens
async function listarMensagens(req, res) {
  try {
    const pagina = Number(req.query.pagina ?? 1);
    const limite = Number(req.query.limite ?? 50);

    if (
      !Number.isSafeInteger(pagina) ||
      pagina < 1 ||
      !Number.isSafeInteger(limite) ||
      limite < 1 ||
      limite > 50 ||
      !Number.isSafeInteger((pagina - 1) * limite)
    ) {
      return res.status(400).json({
        mensagem: "Paginação inválida."
      });
    }

    const mensagens = await chatService.listarMensagens(
      req.usuarioId,
      req.params.id,
      pagina,
      limite
    );

    return res.status(200).json({
      pagina,
      limite,
      mensagens
    });
  } catch (error) {
    return tratarErro(res, error);
  }
}

// Enviar mensagem
async function enviarMensagem(req, res) {
  try {
    const { conteudo } = req.body || {};

    if (
      typeof conteudo !== "string" ||
      !conteudo.trim() ||
      conteudo.trim().length > 1000
    ) {
      return res.status(400).json({
        mensagem:
          "A mensagem deve possuir entre 1 e 1000 caracteres."
      });
    }

    const mensagem = await chatService.enviarMensagem(
      req.usuarioId,
      req.params.id,
      conteudo.trim()
    );

    return res.status(201).json({
      mensagem: "Mensagem enviada com sucesso.",
      dados: mensagem
    });
  } catch (error) {
    return tratarErro(res, error);
  }
}

// Excluir mensagem

async function excluirMensagem(req, res) {
  try {
    const resultado = await chatService.excluirMensagem(
      req.usuarioId,
      req.params.id,
      req.params.idMensagem
    );

    return res.status(200).json(resultado);

  } catch (error) {
    return tratarErro(res, error);
  }
}


module.exports = {
  criarChat,
  listarChats,
  buscarChat,
  listarMensagens,
  enviarMensagem,
  excluirMensagem
};
