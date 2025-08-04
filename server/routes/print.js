const express = require('express');
const printController = require('../controllers/printController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// Routes for printing - remove checkShopAccess since it's handled in controller
router.post('/labels', authenticate, authorize('admin', 'manager', 'cashier'), printController.generateProductLabels);
router.get('/receipt/:saleId', authenticate, printController.generateReceipt);
router.post('/thermal/:saleId', authenticate, printController.printToThermalPrinter);

module.exports = router;