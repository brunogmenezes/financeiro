const express = require('express');
const router = express.Router();
const auditoriaController = require('../controllers/auditoriaController');
const authMiddleware = require('../middlewares/auth');

router.use(authMiddleware);

router.get('/', auditoriaController.getAll);
router.get('/usuario/:usuarioId', auditoriaController.getByUsuario);

module.exports = router;
