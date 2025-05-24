const express = require('express');
const router = express.Router();
const supplierController = require('../controllers/supplierController');
const { authenticate, authorize } = require('../middleware/auth');

// Routes
router.get('/', authenticate, supplierController.getAllSuppliers);
router.get('/:id', authenticate, supplierController.getSupplierById);
router.post('/', authenticate, authorize('admin', 'manager'), supplierController.createSupplier);
router.put('/:id', authenticate, authorize('admin', 'manager'), supplierController.updateSupplier);
router.delete('/:id', authenticate, authorize('admin'), supplierController.deleteSupplier);

module.exports = router;
