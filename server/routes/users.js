const express = require('express');
const userController = require('../controllers/userController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// User routes - accessible by developer, admin, and manager as appropriate
router.get('/', authenticate, authorize('developer', 'admin', 'manager'), userController.getAllUsers);
router.get('/:id', authenticate, authorize('developer', 'admin', 'manager'), userController.getUserById);
router.post('/', authenticate, authorize('developer', 'admin'), userController.createUser);
router.put('/:id', authenticate, authorize('developer', 'admin'), userController.updateUser);
router.patch('/:id/status', authenticate, authorize('developer', 'admin'), userController.toggleUserStatus);
router.delete('/:id', authenticate, authorize('developer', 'admin'), userController.deleteUser);

module.exports = router;
