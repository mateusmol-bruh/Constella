function notFound(req, res) {
  return res.status(404).json({
    mensagem: "Rota não encontrada.",
    metodo: req.method,
    rota: req.originalUrl
  });
}

module.exports = notFound;