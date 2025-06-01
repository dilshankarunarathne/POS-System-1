const express = require('express');
const statsController = require('../controllers/statsController');
const { authenticate, developerOnly } = require('../middleware/auth');

const router = express.Router();

// Developer stats route
router.get('/developer', authenticate, developerOnly, statsController.getDeveloperStats);

// Shop stats route (protected to admin and above)
router.get('/shop', authenticate, statsController.getShopStats);

module.exports = router;