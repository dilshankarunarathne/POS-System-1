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
      required: function() { return !this.isManual; }
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
    },
    isManual: {
      type: Boolean,
      default: false
    },
    name: {
      type: String,
      required: function() { return this.isManual; }
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
  paymentDetails: {
    // Additional payment details like card last 4 digits, transaction ID, etc.
    type: Object
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
  },
  shopId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shop',
    required: true
  }
});

// Add utility method for receipt data
SaleSchema.methods.getReceiptData = function() {
  // Map items with better handling of manual items
  const itemsWithDetails = this.items.map(item => {
    if (item.isManual) {
      return {
        name: item.name || 'Manual Item',
        quantity: item.quantity,
        price: item.price,
        discount: item.discount || 0,
        subtotal: (item.price * item.quantity) - (item.discount || 0)
      };
    } else {
      // For regular product items
      return {
        productId: item.product?._id || item.product,
        name: item.product?.name || 'Unknown Product',
        quantity: item.quantity,
        price: item.price,
        discount: item.discount || 0,
        subtotal: (item.price * item.quantity) - (item.discount || 0)
      };
    }
  });
  
  return {
    id: this._id.toString(),
    invoiceNumber: this.invoiceNumber,
    date: this.createdAt,
    customer: this.customer,
    items: itemsWithDetails,
    subtotal: this.subtotal,
    tax: this.tax,
    discount: this.discount,
    total: this.total,
    paymentMethod: this.paymentMethod,
    user: this.user,
    shopId: this.shopId,
    notes: this.notes
  };
};

// Calculate totals before saving
SaleSchema.pre('save', async function(next) {
  // Generate invoice number if not provided
  if (!this.invoiceNumber) {
    try {
      const today = new Date();
      const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
      
      // Get the last invoice number for today and this shop
      const lastSale = await this.constructor.findOne({
        invoiceNumber: new RegExp(`^INV-${dateStr}-`),
        shopId: this.shopId
      }).sort({ createdAt: -1 });
      
      let nextNumber = 1;
      if (lastSale && lastSale.invoiceNumber) {
        const parts = lastSale.invoiceNumber.split('-');
        if (parts.length >= 3) {
          nextNumber = parseInt(parts[2]) + 1;
        }
      }
      
      this.invoiceNumber = `INV-${dateStr}-${nextNumber.toString().padStart(4, '0')}`;
    } catch (error) {
      return next(error);
    }
  }
  
  // Calculate totals if not already calculated
  if (this.isNew || this.isModified('items')) {
    // Calculate subtotal from items if not specified
    if (!this.subtotal || this.isModified('items')) {
      this.subtotal = this.items.reduce((sum, item) => {
        return sum + (item.price * item.quantity);
      }, 0);
    }
    
    // Calculate item discounts
    const itemDiscounts = this.items.reduce((sum, item) => {
      return sum + (item.discount || 0);
    }, 0);
    
    // Set total discount (item discounts + additional discount)
    if (!this.discount) this.discount = 0;
    
    // Set tax if not specified
    if (!this.tax) this.tax = 0;
    
    // Calculate total - ensuring correct calculation subtracting both discounts
    this.total = this.subtotal - this.discount - itemDiscounts + this.tax;
  }
  
  next();
});

// Pre-save middleware to generate invoice number if not provided
SaleSchema.pre('save', async function(next) {
  if (!this.invoiceNumber && !this.isModified('invoiceNumber')) {
    try {
      const today = new Date();
      const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
      
      // Get the last invoice number for today and this shop
      const lastSale = await this.constructor.findOne({
        invoiceNumber: new RegExp(`^INV-${dateStr}-`),
        shopId: this.shopId
      }).sort({ createdAt: -1 });
      
      let nextNumber = 1;
      if (lastSale && lastSale.invoiceNumber) {
        const parts = lastSale.invoiceNumber.split('-');
        if (parts.length >= 3) {
          nextNumber = parseInt(parts[2]) + 1;
        }
      }
      
      this.invoiceNumber = `INV-${dateStr}-${nextNumber.toString().padStart(4, '0')}`;
      next();
    } catch (error) {
      next(error);
    }
  } else {
    next();
  }
});

module.exports = mongoose.model('Sale', SaleSchema);