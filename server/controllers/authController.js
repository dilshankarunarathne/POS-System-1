const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Generate JWT token
const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, username: user.username, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );
};

// Register a new user
exports.register = async (req, res) => {
  try {
    const { name, username, email, password, role } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ username }, { email }]
    });

    if (existingUser) {
      return res.status(400).json({
        message: 'User already exists with that username or email'
      });
    }

    // Create new user
    const user = new User({
      name,
      username,
      email,
      password,
      role: role || 'cashier', // Default role is cashier
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
    const user = await User.findOne({ username });

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
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const userData = user.toObject();
    delete userData.password;
    
    res.json({ 
      user: {
        ...userData,
        id: userData._id // Ensure id is available for frontend
      }
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};