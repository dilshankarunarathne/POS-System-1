const express = require('express');
const orderController = require('../controllers/orderController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// Purchase order routes
router.get('/', authenticate, authorize('admin', 'manager'), orderController.getAllOrders);
router.get('/:id', authenticate, authorize('admin', 'manager'), orderController.getOrderById);
router.post('/', authenticate, authorize('admin', 'manager'), orderController.createOrder);
router.put('/:id', authenticate, authorize('admin', 'manager'), orderController.updateOrder);
router.patch('/:id/status', authenticate, authorize('admin', 'manager'), orderController.updateOrderStatus);
router.delete('/:id', authenticate, authorize('admin'), orderController.deleteOrder);

module.exports = router;
