const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Authentication middleware
exports.authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Find user with the id from token
    const user = await User.findById(decoded.id).populate('shopId');
    
    if (!user || !user.active) {
      return res.status(401).json({ message: 'User not found or inactive' });
    }
    
    // Add user to request object
    req.user = user;
    next();
  } catch (error) {
    console.error('Authentication error:', error.message);
    res.status(401).json({ message: 'Invalid token' });
  }
};

// Role-based authorization middleware
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    next();
  };
};

// Developer-only middleware
exports.developerOnly = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  
  if (req.user.role !== 'developer') {
    return res.status(403).json({ message: 'Developer access required' });
  }
  
  next();
};

// Shop access control middleware
exports.checkShopAccess = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    // Developers can access all shops
    if (req.user.role === 'developer') {
      return next();
    }

    // Get the shop ID from the request
    const shopId = req.params.shopId || req.body.shopId || req.query.shopId || 
                  (req.user.shopId && req.user.shopId._id ? req.user.shopId._id.toString() : null);

    // If no shop ID is provided or user has no assigned shop
    if (!shopId || !req.user.shopId) {
      return res.status(403).json({ message: 'No shop access' });
    }

    // Check if the user has access to the requested shop
    if (req.user.shopId._id.toString() !== shopId.toString()) {
      return res.status(403).json({ message: 'Access denied for this shop' });
    }

    next();
  } catch (error) {
    console.error('Shop access control error:', error);
    res.status(500).json({ message: 'Error checking shop access' });
  }
};