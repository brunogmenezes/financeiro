const express = require('express');
const router = express.Router();
const { createSubscription, checkStatus, webhook, getHistory } = require('../controllers/subscriptionController');
const auth = require('../middlewares/auth');

// Rota para gerar o PIX de assinatura (Protegida)
router.post('/generate-pix', auth, createSubscription);

// Rota para verificar o status do pagamento (Protegida)
router.get('/status/:txid', auth, checkStatus);

// Rota para buscar o histórico de pagamentos (Protegida)
router.get('/history', auth, getHistory);

// Rota de Webhook da Efí (Pública, pois a Efí que chama)
router.post('/webhook', webhook);

// Obter configurações públicas (Preço da assinatura)
router.get('/config', auth, require('../controllers/subscriptionController').getPublicConfigs);

module.exports = router;
