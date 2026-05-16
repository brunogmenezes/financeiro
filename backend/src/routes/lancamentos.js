const express = require('express');
const router = express.Router();
const lancamentosController = require('../controllers/lancamentosController');
const authMiddleware = require('../middlewares/auth');

const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

router.use(authMiddleware);

router.get('/', lancamentosController.getAll);
router.get('/dashboard', lancamentosController.getDashboard);
router.post('/analyze-invoice', upload.single('invoice'), lancamentosController.analyzeInvoice);
router.post('/confirm-import', lancamentosController.confirmImport);
router.get('/:id', lancamentosController.getById);
router.post('/', lancamentosController.create);
router.put('/:id', lancamentosController.update);
router.patch('/:id/toggle-pago', lancamentosController.togglePago);
router.delete('/all', lancamentosController.deleteAll);
router.delete('/:id', lancamentosController.delete);

module.exports = router;
