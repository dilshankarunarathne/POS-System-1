const mongoose = require('mongoose');

const SaleSchema = new mongoose.Schema({
  invoiceNumber: {
    type: String,
    unique: true
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer'
  },
  items: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    quantity: {
      type: Number,
      required: true
    },
    price: {
      type: Number,
      required: true
    },
    discount: {
      type: Number,
      default: 0
    }
  }],
  subtotal: {
    type: Number,
    required: true
  },
  tax: {
    type: Number,
    default: 0
  },
  discount: {
    type: Number,
    default: 0
  },
  total: {
    type: Number,
    required: true
  },
  paymentMethod: {
    type: String,
    required: true,
    enum: ['cash', 'credit', 'debit', 'other']
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['completed', 'returned', 'cancelled'],
    default: 'completed'
  },
  statusHistory: [{
    status: String,
    reason: String,
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  notes: {
    type: String
  }
});

// Add utility method for receipt data
SaleSchema.methods.getReceiptData = function() {
  return {
    id: this._id.toString(),
    invoiceNumber: this.invoiceNumber,
    date: this.createdAt,
    customer: this.customer,
    items: this.items,
    subtotal: this.subtotal,
    tax: this.tax,
    discount: this.discount,
    total: this.total,
    paymentMethod: this.paymentMethod,
    user: this.user,
    notes: this.notes
  };
};

module.exports = mongoose.model('Sale', SaleSchema);