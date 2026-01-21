const express = require('express');
const router = express.Router();
const lancamentosController = require('../controllers/lancamentosController');
const authMiddleware = require('../middlewares/auth');

router.use(authMiddleware);

router.get('/', lancamentosController.getAll);
router.get('/dashboard', lancamentosController.getDashboard);
router.get('/:id', lancamentosController.getById);
router.post('/', lancamentosController.create);
router.put('/:id', lancamentosController.update);
router.patch('/:id/toggle-pago', lancamentosController.togglePago);
router.delete('/:id', lancamentosController.delete);

module.exports = router;
