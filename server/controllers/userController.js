const User = require('../models/User');

// Get all users
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.status(200).json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Server error fetching users' });
  }
};

// Get user by ID
const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ message: 'Server error fetching user' });
  }
};

// Create user
const createUser = async (req, res) => {
  try {
    const { name, username, email, password, role } = req.body;
    
    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [{ username }, { email }] 
    });
    
    if (existingUser) {
      return res.status(400).json({ message: 'User with this username or email already exists' });
    }
    
    const user = await User.create({
      name,
      username,
      email,
      password,
      role: role || 'cashier'
    });
    
    const userData = user.toObject();
    delete userData.password;
    
    res.status(201).json(userData);
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ message: 'Server error creating user' });
  }
};

// Update user
const updateUser = async (req, res) => {
  try {
    const { name, username, email, role, password } = req.body;
    
    // Check if username or email is already taken by another user
    if (username || email) {
      const existingUser = await User.findOne({
        _id: { $ne: req.params.id },
        $or: [
          ...(username ? [{ username }] : []),
          ...(email ? [{ email }] : [])
        ]
      });
      
      if (existingUser) {
        return res.status(400).json({ message: 'Username or email is already taken' });
      }
    }
    
    // Build update object with only provided fields
    const updateData = {};
    if (name) updateData.name = name;
    if (username) updateData.username = username;
    if (email) updateData.email = email;
    if (role) updateData.role = role;
    if (password) updateData.password = password;
    updateData.updatedAt = new Date();
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.status(200).json(user);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ message: 'Server error updating user' });
  }
};

// Toggle user active status
const toggleUserStatus = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Don't allow deactivating yourself
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot deactivate your own account' });
    }
    
    user.active = !user.active;
    await user.save();
    
    const userData = user.toObject();
    delete userData.password;
    
    res.status(200).json(userData);
  } catch (error) {
    console.error('Error toggling user status:', error);
    res.status(500).json({ message: 'Server error updating user status' });
  }
};

// Delete user
const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Don't allow deleting yourself
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }
    
    await User.findByIdAndDelete(req.params.id);
    
    res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Server error deleting user' });
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  toggleUserStatus,
  deleteUser
};
