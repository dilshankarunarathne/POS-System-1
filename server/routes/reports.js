const express = require('express');
const reportController = require('../controllers/reportController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// Routes for reports - only accessible by managers and admins
router.get('/sales/summary', authenticate, authorize('admin', 'manager'), reportController.getSalesSummary);
router.get('/sales/products', authenticate, authorize('admin', 'manager'), reportController.getProductSalesReport);
router.get('/inventory', authenticate, authorize('admin', 'manager'), reportController.getInventoryStatusReport);
router.get('/sales/pdf', authenticate, authorize('admin', 'manager'), reportController.generateSalesReport);
router.get('/sales/daily', authenticate, authorize('admin', 'manager'), reportController.getDailySales);

module.exports = router;