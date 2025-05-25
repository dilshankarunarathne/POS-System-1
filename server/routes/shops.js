const express = require('express');
const shopController = require('../controllers/shopController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// Get all shops (admin only)
router.get('/', authenticate, authorize('admin'), shopController.getAllShops);

// Get single shop (admin or shop members)
router.get('/:id', authenticate, shopController.getShopById);

// Create shop (admin only)
router.post('/', authenticate, authorize('admin'), shopController.createShop);

// Update shop (admin or owner)
router.put('/:id', authenticate, shopController.updateShop);

// Get shop users (admin or owner)
router.get('/:id/users', authenticate, shopController.getShopUsers);

module.exports = router;
