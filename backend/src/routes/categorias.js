const express = require('express');
const router = express.Router();
const categoriasController = require('../controllers/categoriasController');
const auth = require('../middlewares/auth');
const adminAuth = require('../middlewares/adminAuth');

// Rotas de categorias
router.get('/', auth, categoriasController.getAll);
router.post('/', auth, adminAuth, categoriasController.create);
router.put('/:id', auth, adminAuth, categoriasController.update);
router.delete('/:id', auth, adminAuth, categoriasController.delete);

// Rotas de Limites (Uso pessoal)
router.post('/:id/limite', auth, categoriasController.saveLimiteCategoria);
router.post('/subcategorias/:id/limite', auth, categoriasController.saveLimiteSubcategoria);

// Rotas de subcategorias
router.get('/:categoriaId/subcategorias', auth, categoriasController.getSubcategorias);
router.post('/:categoriaId/subcategorias', auth, adminAuth, categoriasController.createSubcategoria);
router.put('/subcategorias/:id', auth, adminAuth, categoriasController.updateSubcategoria);
router.delete('/subcategorias/:id', auth, adminAuth, categoriasController.deleteSubcategoria);

module.exports = router;
