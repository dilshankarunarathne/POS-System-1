const User = require('../models/User');
const Shop = require('../models/Shop');

// Get developer dashboard stats
exports.getDeveloperStats = async (req, res) => {
  try {
    // Ensure user is a developer
    if (req.user.role !== 'developer') {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Get total shops count
    const totalShops = await Shop.countDocuments();
    const activeShops = await Shop.countDocuments({ active: true });
    const inactiveShops = await Shop.countDocuments({ active: false });

    // Get total users count
    const totalUsers = await User.countDocuments();

    // Get users by role
    const usersByRole = {
      developer: await User.countDocuments({ role: 'developer' }),
      admin: await User.countDocuments({ role: 'admin' }),
      manager: await User.countDocuments({ role: 'manager' }),
      cashier: await User.countDocuments({ role: 'cashier' })
    };

    res.json({
      totalShops,
      activeShops,
      inactiveShops,
      totalUsers,
      usersByRole
    });
  } catch (error) {
    console.error('Error getting developer stats:', error);
    res.status(500).json({ 
      message: 'Server error getting stats',
      error: error.message 
    });
  }
};