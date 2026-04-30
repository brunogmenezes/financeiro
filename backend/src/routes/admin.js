const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const auth = require('../middlewares/auth');
const adminAuth = require('../middlewares/adminAuth');

// Todas as rotas requerem autenticação e privilégios de admin
router.use(auth, adminAuth);

router.get('/users', adminController.listUsers);
router.post('/users/:id/reset-password', adminController.resetPassword);
router.patch('/users/:id/toggle-admin', adminController.toggleAdmin);
router.patch('/users/:id/toggle-pro', adminController.togglePro);
router.delete('/users/:id', adminController.deleteUser);

// Histórico de pagamentos do usuário
router.get('/users/:id/payments', adminController.getUserPaymentHistory);

// Configurações Globais
router.get('/configs', adminController.getConfigs);
router.post('/configs', adminController.updateConfig);

module.exports = router;
