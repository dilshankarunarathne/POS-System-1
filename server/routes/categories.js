const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const { authenticate, authorize } = require('../middleware/auth');

// Routes
router.get('/', authenticate, categoryController.getAllCategories);
router.get('/:id', authenticate, categoryController.getCategoryById);
router.post('/', authenticate, authorize('admin', 'manager'), categoryController.createCategory);
router.put('/:id', authenticate, authorize('admin', 'manager'), categoryController.updateCategory);
router.delete('/:id', authenticate, authorize('admin'), categoryController.deleteCategory);

module.exports = router;

