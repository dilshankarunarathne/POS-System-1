const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  username: {
    type: String,
    required: true,
    unique: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please enter a valid email address'
    ]
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['developer', 'admin', 'manager', 'cashier'],
    default: 'cashier'
  },
  shopId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shop'
  },
  active: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Hash password before saving
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    this.updatedAt = Date.now();
    next();
  } catch (error) {
    next(error);
  }
});

// Check if password matches
UserSchema.methods.checkPassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};

// Get user's shops based on role
UserSchema.methods.getAccessibleShops = async function() {
  if (this.role === 'developer') {
    // Developers can access all shops
    return await mongoose.model('Shop').find({ active: true });
  } else if (this.role === 'admin' && this.shopId) {
    // Admins can only access their assigned shop
    return [await mongoose.model('Shop').findById(this.shopId)];
  } else if (this.shopId) {
    // Other roles can only access their assigned shop
    return [await mongoose.model('Shop').findById(this.shopId)];
  }
  return [];
};

module.exports = mongoose.model('User', UserSchema);