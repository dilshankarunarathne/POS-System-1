const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Shop = require('../models/Shop');

// Generate JWT token
const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, username: user.username, role: user.role, shopId: user.shopId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );
};

// Register a new user
exports.register = async (req, res) => {
  try {
    const { name, username, email, password, role, shopId } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ username }, { email }]
    });

    if (existingUser) {
      return res.status(400).json({
        message: 'User already exists with that username or email'
      });
    }

    // Validate role and shop permissions
    if (req.user && req.user.role !== 'developer') {
      // Non-developers can only create users for their own shop
      if (shopId && (!req.user.shopId || req.user.shopId.toString() !== shopId)) {
        return res.status(403).json({ 
          message: 'You can only create users for your own shop' 
        });
      }
      
      // Non-developers can't create developer accounts
      if (role === 'developer') {
        return res.status(403).json({ 
          message: 'You do not have permission to create developer accounts' 
        });
      }
      
      // Shop admins can only create manager or cashier accounts
      if (req.user.role === 'admin' && role === 'admin') {
        return res.status(403).json({ 
          message: 'You do not have permission to create admin accounts' 
        });
      }
    }
    
    // If shopId is provided, verify the shop exists
    let shop = null;
    if (shopId) {
      shop = await Shop.findById(shopId);
      if (!shop) {
        return res.status(404).json({ message: 'Shop not found' });
      }
    }

    // Create new user
    const user = new User({
      name,
      username,
      email,
      password,
      role: role || 'cashier',
      shopId: shopId || req.user?.shopId,
      createdBy: req.user?._id
    });

    await user.save();

    // Generate token
    const token = generateToken(user);

    // Return user data without password
    const userData = user.toObject();
    delete userData.password;

    res.status(201).json({
      user: userData,
      token,
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
};

// Login user
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Find user by username
    const user = await User.findOne({ username }).populate('shopId');

    if (!user || !user.active) {
      return res.status(401).json({ message: 'Invalid credentials or inactive account' });
    }

    // Check password
    const isMatch = await user.checkPassword(password);

    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate token
    const token = generateToken(user);

    // Return user data without password
    const userData = user.toObject();
    delete userData.password;

    res.json({
      user: userData,
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
};

// Get current user
exports.getCurrentUser = async (req, res) => {
  try {
    // User is already available from auth middleware
    const user = await User.findById(req.user._id)
      .populate('shopId')
      .select('-password');
      
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Get accessible shops for this user
    const accessibleShops = await user.getAccessibleShops();
    
    res.json({ 
      user: {
        ...user.toObject(),
        id: user._id, // Ensure id is available for frontend
        accessibleShops: accessibleShops.map(shop => ({
          id: shop._id,
          name: shop.name
        }))
      }
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};