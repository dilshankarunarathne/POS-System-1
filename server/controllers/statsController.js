const User = require('../models/User');
const Shop = require('../models/Shop');
const Sale = require('../models/Sale'); // Add Sale model for additional stats

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

    // Get total sales for basic stats
    const totalSales = await Sale.countDocuments();
    const totalRevenue = await Sale.aggregate([
      { $match: { status: { $ne: 'cancelled' } } },
      { $group: { _id: null, total: { $sum: "$total" } } }
    ]);

    res.json({
      totalShops,
      activeShops,
      inactiveShops,
      totalUsers,
      usersByRole,
      totalSales,
      totalRevenue: totalRevenue.length > 0 ? totalRevenue[0].total : 0
    });
  } catch (error) {
    console.error('Error getting developer stats:', error);
    res.status(500).json({ message: 'Server error getting stats' });
  }
};

// Add a method for shop-specific stats that might be useful later
exports.getShopStats = async (req, res) => {
  try {
    const { shopId } = req.query;
    
    // Verify user has access to this shop
    if (req.user.role !== 'developer' && 
        (!req.user.shopId || req.user.shopId.toString() !== shopId)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // Implement shop-specific stats here
    
    res.json({
      message: 'Shop stats endpoint ready for implementation'
    });
  } catch (error) {
    console.error('Error getting shop stats:', error);
    res.status(500).json({ message: 'Server error getting shop stats' });
  }
};