const express = require('express');
const userController = require('../controllers/userController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// User routes - most restricted to admin/manager
router.get('/', authenticate, authorize('admin', 'manager'), userController.getAllUsers);
router.get('/:id', authenticate, authorize('admin', 'manager'), userController.getUserById);
router.post('/', authenticate, authorize('admin'), userController.createUser);
router.put('/:id', authenticate, authorize('admin'), userController.updateUser);
router.patch('/:id/status', authenticate, authorize('admin'), userController.toggleUserStatus);
router.delete('/:id', authenticate, authorize('admin'), userController.deleteUser);

module.exports = router;
