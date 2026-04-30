const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const auth = require('../middlewares/auth');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/google', authController.googleLogin);
router.get('/perfil', auth, authController.getPerfil);
router.put('/perfil', auth, authController.updatePerfil);
router.post('/complete-onboarding', auth, authController.completeOnboarding);

module.exports = router;
