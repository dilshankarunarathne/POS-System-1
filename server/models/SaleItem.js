const mongoose = require('mongoose');

const SaleItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  price: {
    type: Number,
    required: true
  },
  discount: {
    type: Number,
    default: 0
  },
  subtotal: {
    type: Number,
    required: true
  }
});

// Calculate subtotal before saving
SaleItemSchema.pre('save', function(next) {
  this.subtotal = (this.price * this.quantity) - this.discount;
  next();
});

module.exports = mongoose.model('SaleItem', SaleItemSchema);