const express = require('express');
const router = express.Router();
const contasController = require('../controllers/contasController');
const authMiddleware = require('../middlewares/auth');

router.use(authMiddleware);

router.get('/', contasController.getAll);
router.get('/:id', contasController.getById);
router.post('/', contasController.create);
router.put('/:id', contasController.update);
router.delete('/:id', contasController.delete);

module.exports = router;
