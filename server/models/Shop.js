const mongoose = require('mongoose');

const ShopSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  address: {
    type: String,
    trim: true
  },
  phone: {
    type: String
  },
  email: {
    type: String
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  logo: {
    type: String
  },
  active: {
    type: Boolean,
    default: true
  },
  settings: {
    currency: {
      type: String,
      default: 'Rs'
    },
    taxRate: {
      type: Number,
      default: 0
    },
    receiptHeader: {
      type: String,
      default: 'Thank you for your purchase!'
    },
    receiptFooter: {
      type: String,
      default: 'Return policy: Items can be returned within 7 days with receipt'
    }
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

// Update timestamps on save
ShopSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Shop', ShopSchema);
