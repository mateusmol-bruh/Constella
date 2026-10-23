const router = require('express').Router();
const { rateLimit } = require('express-rate-limit');
const controller = require('../controllers/notificacao.controller');
router.use(require('../middlewares/auth.middleware'));
router.use(rateLimit({ windowMs: 60000, limit: 20, keyGenerator: req => req.usuarioId, standardHeaders: 'draft-8', legacyHeaders: false }));
router.put('/dispositivo', controller.registrar);
router.delete('/dispositivo', controller.desregistrar);
module.exports = router;
