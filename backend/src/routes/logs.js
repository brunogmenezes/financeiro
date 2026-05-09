const express = require('express');
const router = express.Router();
const logsController = require('../controllers/logsController');
const authMiddleware = require('../middlewares/auth');

router.use(authMiddleware);

router.get('/', logsController.getAll);
router.get('/usuario/:usuarioId', logsController.getByUsuario);

module.exports = router;
