function tratarErroGlobal(error, req, res, next) {
  console.error("Erro não tratado:", error);

  if (res.headersSent) {
    return next(error);
  }

  if (error.statusCode) {
    return res.status(error.statusCode).json({
      mensagem:
        error.message ||
        "Erro ao processar a requisição."
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