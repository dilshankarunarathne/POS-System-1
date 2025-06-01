const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { protect } = require('../middleware/authMiddleware');

// Apply auth protection to all routes
router.use(protect);

// Define routes
router.get('/sales-summary', reportController.getSalesSummary);
router.get('/product-sales', reportController.getProductSalesReport);

// Fix the inventory route - ensure it's properly defined
router.get('/inventory-status', reportController.getInventoryStatusReport);

router.get('/sales/daily', reportController.getDailySales);
router.get('/generate-sales-report', reportController.generateSalesReport);

module.exports = router;
