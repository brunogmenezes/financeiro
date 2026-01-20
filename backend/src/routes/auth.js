const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const auth = require('../middlewares/auth');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/perfil', auth, authController.getPerfil);
router.put('/perfil', auth, authController.updatePerfil);

module.exports = router;
