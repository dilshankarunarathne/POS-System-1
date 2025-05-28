const Shop = require('../models/Shop');

// Middleware to check if user has access to specified shop
exports.shopAccess = (requiredAccess = 'read') => {
  return async (req, res, next) => {
    try {
      const shopId = req.params.shopId || req.query.shopId || req.body.shopId;
      
      // If no shop is specified, skip this check
      if (!shopId) {
        return next();
      }
      
      // Check if user is authenticated first
      if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      
      // Developers have access to all shops
      if (req.user.role === 'developer') {
        return next();
      }
      
      // For other roles, check if they belong to the specified shop
      if (req.user.shop && req.user.shop.toString() === shopId) {
        // For write operations, check user role
        if (requiredAccess === 'write' && req.user.role !== 'admin' && req.user.role !== 'manager') {
          return res.status(403).json({ message: 'You do not have permission to modify this shop' });
        }
        return next();
      }
      
      return res.status(403).json({ message: 'You do not have access to this shop' });
    } catch (error) {
      console.error('Shop authorization error:', error.message);
      res.status(500).json({ message: 'Server error during shop authorization' });
    }
  };
};

// Middleware to set shop context
exports.setShopContext = async (req, res, next) => {
  try {
    // For explicit shop ID in the request
    let shopId = req.params.shopId || req.query.shopId || req.body.shopId;
    
    // If not specified, use the user's assigned shop
    if (!shopId && req.user && req.user.shop) {
      shopId = req.user.shop;
    }
    
    if (!shopId && req.user && req.user.role !== 'developer') {
      return res.status(400).json({ message: 'Shop ID required for this operation' });
    }
    
    // For developers without a specific shop, we don't set a context
    if (!shopId && req.user && req.user.role === 'developer') {
      return next();
    }
    
    // Set the shop context for the request
    if (shopId) {
      const shop = await Shop.findById(shopId);
      if (!shop) {
        return res.status(404).json({ message: 'Shop not found' });
      }
      req.shopContext = shop;
    }
    
    next();
  } catch (error) {
    console.error('Error setting shop context:', error.message);
    res.status(500).json({ message: 'Server error setting shop context' });
  }
};
