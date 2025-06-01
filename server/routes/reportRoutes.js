const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { protect, authMiddleware } = require('../middleware/authMiddleware');

// Apply auth protection to all routes
router.use(protect);

// Define routes
router.get('/sales-summary', reportController.getSalesSummary);
router.get('/product-sales', reportController.getProductSalesReport);

// Fix the inventory route - ensure it's properly defined
router.get('/inventory-status', reportController.getInventoryStatusReport);

router.get('/sales/daily', reportController.getDailySales);
router.get('/generate-sales-report', reportController.generateSalesReport);

// Add the new route for profit distribution report
router.get('/profit-distribution', authMiddleware, reportController.getProfitDistribution);

module.exports = router;
