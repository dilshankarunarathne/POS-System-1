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
// Ensure the PDF generation route uses the correct controller method
router.get('/sales-report', authenticate, authorize('admin', 'manager', 'developer'), checkShopAccess, reportController.generateSalesReport);
// Add detailed profit distribution report route
router.get('/sales/profit-detailed', authenticate, authorize('admin', 'manager', 'developer'), checkShopAccess, reportController.getProfitDistributionDetailed);

module.exports = router;