const express = require('express');
const router = express.Router();
const entradasProjetivasController = require('../controllers/entradasProjetivasController');
const authMiddleware = require('../middlewares/auth');

router.use(authMiddleware);

router.get('/', entradasProjetivasController.listar);
router.post('/', entradasProjetivasController.criar);
router.post('/bulk', entradasProjetivasController.criarMultiplos);
router.put('/:id', entradasProjetivasController.atualizar);
router.delete('/:id', entradasProjetivasController.deletar);

module.exports = router;
