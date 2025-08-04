const express = require('express');
const reportController = require('../controllers/reportController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// Routes for reports - accessible by admins, managers, developers, and cashiers
router.get('/sales/summary', authenticate, authorize('admin', 'manager', 'developer', 'cashier'), reportController.getSalesSummary);
router.get('/sales/products', authenticate, authorize('admin', 'manager', 'developer', 'cashier'), reportController.getProductSalesReport);
router.get('/inventory/status', authenticate, authorize('admin', 'manager', 'developer'), reportController.getInventoryStatusReport);
router.get('/sales/daily', authenticate, authorize('admin', 'manager', 'developer', 'cashier'), reportController.getDailySales);
router.get('/sales/profit', authenticate, authorize('admin', 'manager', 'developer'), reportController.getProfitDistribution);
router.get('/sales-report', authenticate, authorize('admin', 'manager', 'developer', 'cashier'), reportController.generateSalesReport);
router.get('/sales/profit-detailed', authenticate, authorize('admin', 'manager', 'developer'), reportController.getProfitDistributionDetailed);

module.exports = router;