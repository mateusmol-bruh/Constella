const publico = require("../services/publico.service");

async function listarConteudos(req, res, next) {
  try { return res.status(200).json(await publico.listarConteudosPublicos()); }
  catch (erro) { return next(erro); }
}

async function detalharConteudo(req, res, next) {
  try { return res.status(200).json(await publico.buscarConteudoPublico(req.params.id)); }
  catch (erro) { return next(erro); }
}

async function listarForuns(req, res, next) {
  try { return res.status(200).json(await publico.listarForunsPublicos()); }
  catch (erro) { return next(erro); }
}

async function apresentarPro(req, res, next) {
  try { return res.status(200).json(await publico.apresentarProPublico()); }
  catch (erro) { return next(erro); }
}

module.exports = { listarConteudos, detalharConteudo, listarForuns, apresentarPro };
