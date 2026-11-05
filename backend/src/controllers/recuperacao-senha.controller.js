const service = require('../services/recuperacao-senha.service'),
  v = require('../utils/recuperacao-validacao');
const wrap = (fn) => async (req, res, next) => {
  try {
    return await fn(req, res);
  } catch (error) {
    return next(error);
  }
};
const solicitar = wrap(async (req, res) => {
  service.solicitar(req.recoveryEmail);
  return res.status(202).json({ message: service.REQUEST_MESSAGE });
});
const verificar = wrap(async (req, res) => {
  await service.verificar(req.recoveryEmail, v.codigo(req.body?.codigo));
  return res.json({ message: 'Código verificado. Defina sua nova senha.' });
});
const redefinir = wrap(async (req, res) => {
  await service.redefinir(
    req.recoveryEmail,
    v.codigo(req.body?.codigo),
    v.senha(req.body?.novaSenha),
  );
  return res.json({ message: service.SUCCESS_MESSAGE });
});
module.exports = { solicitar, verificar, redefinir };
