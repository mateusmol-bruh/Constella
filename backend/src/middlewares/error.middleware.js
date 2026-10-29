function tratarErroGlobal(error, req, res, next) {
  // Não registrar payload, SQL, tokens, hashes nem o erro bruto de drivers.
  if (!error.statusCode || error.statusCode >= 500) {
    console.error("Erro ao processar requisição:", error.code || error.name || "Error");
  }

  if (res.headersSent) {
    return next(error);
  }

  if (error.type === "entity.parse.failed") {
    return res.status(400).json({ mensagem: "JSON inválido." });
  }
  if (error.type === "entity.too.large") {
    return res.status(413).json({ mensagem: "Corpo da requisição muito grande." });
  }

  if (error.code === "P2022" && /onboarding_concluido|apresentacao/.test(String(error.meta?.column || ""))) {
    return res.status(503).json({
      codigo: "ONBOARDING_MIGRACAO_PENDENTE",
      mensagem: "A persistência do onboarding aguarda migração autorizada no servidor."
    });
  }

  if (error.statusCode) {
    return res.status(error.statusCode).json({
      mensagem:
        error.message ||
        "Erro ao processar a requisição.",
      ...(error.codigo ? { codigo: error.codigo } : {})
    });
  }

  // Registro não encontrado
  if (error.code === "P2025") {
    return res.status(404).json({
      mensagem: "Registro não encontrado."
    });
  }

  // Registro duplicado
  if (error.code === "P2002") {
    return res.status(409).json({
      mensagem:
        "Já existe um registro com esses dados."
    });
  }

  // Violação de chave estrangeira
  if (error.code === "P2003") {
    return res.status(409).json({
      mensagem:
        "A operação não pode ser realizada devido a registros relacionados."
    });
  }

  // Prisma recebeu dados inválidos
  if (
    error.name ===
    "PrismaClientValidationError"
  ) {
    return res.status(400).json({
      mensagem:
        "Dados inválidos enviados para a API."
    });
  }

  return res.status(500).json({
    mensagem: "Erro interno do servidor."
  });
}

module.exports = tratarErroGlobal;
