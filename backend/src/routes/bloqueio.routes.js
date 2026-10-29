const router=require('express').Router();
const controller=require('../controllers/bloqueio.controller');
router.use(require('../middlewares/auth.middleware'));
router.get('/',controller.listar);
router.get('/:id',controller.status);
router.post('/:id',controller.bloquear);
router.delete('/:id',controller.desbloquear);
module.exports=router;
