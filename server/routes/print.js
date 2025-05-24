const express = require('express');
const printController = require('../controllers/printController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// Routes for printing
router.post('/labels', authenticate, authorize('admin', 'manager', 'cashier'), printController.generateProductLabels);
router.get('/receipt/:saleId', authenticate, printController.generateReceipt);

module.exports = router; 