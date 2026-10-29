const service = require('../services/notificacao.service');
const registrar = async (req, res, next) => {
  try { res.json(await service.registrar(req.usuarioId, req.body || {})); } catch (error) { next(error); }
};
const desregistrar = async (req, res, next) => {
  try { res.json(await service.desregistrar(req.usuarioId, req.body?.token)); } catch (error) { next(error); }
};
module.exports = { registrar, desregistrar };
