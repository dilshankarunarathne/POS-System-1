const express = require('express');
const shopController = require('../controllers/shopController');
const { authenticate, developerOnly } = require('../middleware/auth');

const router = express.Router();

// Shop routes - all require developer role
router.get('/', authenticate, developerOnly, shopController.getAllShops);
router.get('/:id', authenticate, developerOnly, shopController.getShopById);
router.post('/', authenticate, developerOnly, shopController.createShop);
router.put('/:id', authenticate, developerOnly, shopController.updateShop);
router.delete('/:id', authenticate, developerOnly, shopController.deleteShop);
router.patch('/:id/toggle-status', authenticate, developerOnly, shopController.toggleShopStatus);

module.exports = router;
