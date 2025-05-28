const mongoose = require('mongoose');

const CustomerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  phone: {
    type: String,
    trim: true
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String
  },
  shopId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shop',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Add indexes for common queries
CustomerSchema.index({ shopId: 1, phone: 1 }, { unique: true }); // Make phone unique per shop
CustomerSchema.index({ shopId: 1, email: 1 }, { unique: true, sparse: true }); // Make email unique per shop, but allow null

module.exports = mongoose.model('Customer', CustomerSchema);
