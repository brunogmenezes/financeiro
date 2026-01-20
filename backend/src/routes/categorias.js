const express = require('express');
const router = express.Router();
const categoriasController = require('../controllers/categoriasController');
const auth = require('../middlewares/auth');

// Rotas de categorias
router.get('/', auth, categoriasController.getAll);
router.post('/', auth, categoriasController.create);
router.put('/:id', auth, categoriasController.update);
router.delete('/:id', auth, categoriasController.delete);

// Rotas de subcategorias
router.get('/:categoriaId/subcategorias', auth, categoriasController.getSubcategorias);
router.post('/:categoriaId/subcategorias', auth, categoriasController.createSubcategoria);
router.put('/subcategorias/:id', auth, categoriasController.updateSubcategoria);
router.delete('/subcategorias/:id', auth, categoriasController.deleteSubcategoria);

module.exports = router;
