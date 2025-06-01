const express = require('express');
const reportController = require('../controllers/reportController');
const { authenticate, authorize, checkShopAccess } = require('../middleware/auth');

const router = express.Router();

// Routes for reports - only accessible by managers and admins
router.get('/sales/summary', authenticate, authorize('admin', 'manager', 'developer'), checkShopAccess, reportController.getSalesSummary);
router.get('/sales/products', authenticate, authorize('admin', 'manager', 'developer'), checkShopAccess, reportController.getProductSalesReport);
router.get('/inventory/status', authenticate, authorize('admin', 'manager', 'developer'), checkShopAccess, reportController.getInventoryStatusReport);
router.get('/sales/daily', authenticate, authorize('admin', 'manager', 'developer'), checkShopAccess, reportController.getDailySales);
// Add the new route for profit distribution
router.get('/sales/profit', authenticate, authorize('admin', 'manager', 'developer'), checkShopAccess, reportController.getProfitDistribution);
// Use consistent naming - keep only one route for generating reports
router.get('/sales-report', authenticate, authorize('admin', 'manager', 'developer'), checkShopAccess, reportController.generateSalesReport);

module.exports = router;