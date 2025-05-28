const express = require('express');
const reportController = require('../controllers/reportController');
const { authenticate, authorize, checkShopAccess } = require('../middleware/auth');

const router = express.Router();

// Routes for reports - only accessible by managers and admins
router.get('/sales/summary', authenticate, authorize('admin', 'manager', 'developer'), checkShopAccess, reportController.getSalesSummary);
router.get('/sales/products', authenticate, authorize('admin', 'manager', 'developer'), checkShopAccess, reportController.getProductSalesReport);
router.get('/inventory/status', authenticate, authorize('admin', 'manager', 'developer'), checkShopAccess, reportController.getInventoryStatusReport);
router.get('/sales/daily', authenticate, authorize('admin', 'manager', 'developer'), checkShopAccess, reportController.getDailySales);
router.get('/sales/generate', authenticate, authorize('admin', 'manager', 'developer'), checkShopAccess, reportController.generateSalesReport);

module.exports = router;