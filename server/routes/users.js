const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate, authorize } = require('../middleware/auth');

// Base access restrictions - require authentication for all routes
router.use(authenticate);

// Get all users - accessible by admins, managers, and developers
router.get('/', authorize('admin', 'manager', 'developer'), userController.getAllUsers);

// Get user by ID
router.get('/:id', authorize('admin', 'manager', 'developer'), userController.getUserById);

// Create user
router.post('/', authorize('admin', 'developer'), userController.createUser);

// Update user
router.put('/:id', authorize('admin', 'developer'), userController.updateUser);

// Toggle user status (active/inactive)
router.patch('/:id/toggle-status', authorize('admin', 'developer'), userController.toggleUserStatus);

// Delete user
router.delete('/:id', authorize('admin', 'developer'), userController.deleteUser);

module.exports = router;
