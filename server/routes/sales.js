const express = require('express');
const salesController = require('../controllers/salesController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// Routes for sales
router.post('/', authenticate, salesController.createSale);
router.get('/', authenticate, salesController.getAllSales);
router.get('/:id', authenticate, salesController.getSaleById);
router.patch('/:id/status', authenticate, authorize('admin', 'manager'), salesController.updateSaleStatus);

module.exports = router; 