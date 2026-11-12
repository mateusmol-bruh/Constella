const { Router } = require('express'),
  { rateLimit } = require('express-rate-limit'),
  { createHmac } = require('node:crypto');
const c = require('../controllers/recuperacao-senha.controller'),
  v = require('../utils/recuperacao-validacao'),
  config = require('../utils/recuperacao-config');
const router = Router(),
  options = {
    windowMs: 900000,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: {
      mensagem: 'Muitas tentativas. Aguarde antes de tentar novamente.',
    },
  };
const requestIp = rateLimit({ ...options, limit: 5 }),
  validateIp = rateLimit({ ...options, limit: 30 });
const emailKey = (req) =>
  createHmac('sha256', config.secret())
    .update('constella:recovery-limit:' + req.recoveryEmail)
    .digest('hex');
const requestEmail = rateLimit({
    ...options,
    windowMs: 3600000,
    limit: 5,
    keyGenerator: emailKey,
  }),
  validateEmail = rateLimit({ ...options, limit: 20, keyGenerator: emailKey });
function email(req, res, next) {
  try {
    req.recoveryEmail = v.email(req.body?.email);
    next();
  } catch (e) {
    next(e);
  }
}
function available(req, res, next) {
  try {
    config.configured();
    next();
  } catch (e) {
    next(e);
  }
}
function secret(req, res, next) {
  try {
    config.secret();
    next();
  } catch (e) {
    next(e);
  }
}
router.post(
  '/forgot-password',
  requestIp,
  email,
  available,
  requestEmail,
  c.solicitar,
);
router.post(
  '/verify-reset-code',
  validateIp,
  email,
  secret,
  validateEmail,
  c.verificar,
);
router.post(
  '/reset-password',
  validateIp,
  email,
  secret,
  validateEmail,
  c.redefinir,
);
module.exports = router;
