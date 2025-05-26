const mongoose = require('mongoose');
const Sale = require('../models/Sale');
const Product = require('../models/Product');
const Customer = require('../models/Customer');

// Generate invoice number
const generateInvoiceNumber = async () => {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
  
  // Get the last invoice number for today
  const lastSale = await Sale.findOne({
    invoiceNumber: new RegExp(`^INV-${dateStr}-`)
  }).sort({ createdAt: -1 });
  
  let nextNumber = 1;
  if (lastSale && lastSale.invoiceNumber) {
    const parts = lastSale.invoiceNumber.split('-');
    if (parts.length >= 3) {
      nextNumber = parseInt(parts[2]) + 1;
    }
  }
  
  return `INV-${dateStr}-${nextNumber.toString().padStart(4, '0')}`;
};

// Create a new sale
exports.createSale = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { items, customerName, customerPhone, ...saleData } = req.body;
    
    // Generate invoice number if not provided
    if (!saleData.invoiceNumber) {
      saleData.invoiceNumber = await generateInvoiceNumber();
    }
    
    // Create customer if customerName is provided but no customer ID
    let customerId = saleData.customer;
    if (!customerId && customerName) {
      try {
        // Check if customer already exists with this phone number
        let existingCustomer = null;
        if (customerPhone) {
          existingCustomer = await Customer.findOne({ phone: customerPhone });
        }
        
        if (existingCustomer) {
          customerId = existingCustomer._id;
        } else {
          // Create new customer
          const newCustomer = await Customer.create({
            name: customerName,
            phone: customerPhone,
            createdAt: new Date()
          });
          customerId = newCustomer._id;
        }
      } catch (customerErr) {
        console.error('Could not create customer:', customerErr);
        // Continue without customer if creation fails
      }
    }
    
    // Create the sale
    const newSale = new Sale({
      ...saleData,
      customer: customerId,
      items,
      user: req.user.id  // Add user ID from authenticated request
    });
    
    await newSale.save({ session });
    
    // Update inventory for each product
    for (const item of items) {
      const productId = item.product || item.productId;
      await Product.updateOne(
        { _id: productId },
        { $inc: { quantity: -item.quantity } },
        { session }
      );
    }
    
    await session.commitTransaction();
    session.endSession();
    
    // Return the sale with populated items
    const completeSale = await Sale.findById(newSale._id)
      .populate('customer', 'name email phone')
      .populate('user', 'name username')
      .populate('items.product');
      
    res.status(201).json(completeSale);
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error('Error creating sale:', err.message);
    res.status(500).json({ message: 'Server error creating sale', error: err.message });
  }
};

// Get all sales with pagination and filtering
exports.getSales = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      startDate,
      endDate,
      paymentMethod,
      minAmount,
      maxAmount,
      sort = 'createdAt',
      order = 'desc'
    } = req.query;
    
    // Prepare filter conditions
    const filter = {};
    
    // Date range filter
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        filter.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = endDateTime;
      }
    }
    
    // Payment method filter
    if (paymentMethod) {
      filter.paymentMethod = paymentMethod;
    }
    
    // Amount range filter
    if (minAmount || maxAmount) {
      filter.total = {};
      if (minAmount) {
        filter.total.$gte = Number(minAmount);
      }
      if (maxAmount) {
        filter.total.$lte = Number(maxAmount);
      }
    }
    
    // Set up sort options
    const sortOptions = {};
    sortOptions[sort] = order === 'desc' ? -1 : 1;
    
    // Query sales with pagination
    const sales = await Sale.find(filter)
      .populate('customer')
      .populate('user', 'name username')
      .sort(sortOptions)
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));
    
    // Get total count for pagination
    const totalSales = await Sale.countDocuments(filter);
    
    res.status(200).json({
      sales,
      totalPages: Math.ceil(totalSales / Number(limit)),
      currentPage: Number(page),
      totalSales
    });
  } catch (err) {
    console.error('Error fetching sales:', err.message);
    res.status(500).json({ message: 'Server error fetching sales' });
  }
};

// Get sale by id
exports.getSaleById = async (req, res) => {
  try {
    const saleId = req.params.id;
    
    // Check if ID exists
    if (!saleId) {
      return res.status(400).json({ message: 'Sale ID is required' });
    }
    
    // Check if ID is valid
    if (!mongoose.Types.ObjectId.isValid(saleId)) {
      return res.status(400).json({ message: 'Invalid sale ID format' });
    }
    
    const sale = await Sale.findById(saleId)
      .populate('customer', 'name email phone')
      .populate('user', 'name username')
      .populate('items.product');
    
    if (!sale) {
      return res.status(404).json({ message: 'Sale not found' });
    }
    
    res.status(200).json(sale);
  } catch (err) {
    console.error('Error fetching sale:', err.message);
    res.status(500).json({ message: 'Server error fetching sale details' });
  }
};

// Update sale status (for returns or cancellations)
exports.updateSaleStatus = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { id } = req.params;
    const { status, reason } = req.body;
    
    if (!status) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: 'Status is required' });
    }
    
    const sale = await Sale.findById(id).session(session);
    
    if (!sale) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: 'Sale not found' });
    }
    
    const oldStatus = sale.status || 'completed';
    
    // Update sale with new status
    sale.status = status;
    
    // Add status history
    if (!sale.statusHistory) {
      sale.statusHistory = [];
    }
    
    sale.statusHistory.push({
      status,
      reason,
      updatedBy: req.user.id,
      updatedAt: new Date()
    });
    
    await sale.save({ session });
    
    // If returning items, adjust product inventory
    if ((oldStatus !== 'returned' && status === 'returned')) {
      for (const item of sale.items) {
        const product = await Product.findById(item.product).session(session);
        if (product) {
          // Add the returned quantity back to inventory
          product.quantity += item.quantity;
          await product.save({ session });
        }
      }
    }
    
    await session.commitTransaction();
    session.endSession();
    
    // Return updated sale with populated data
    const updatedSale = await Sale.findById(id)
      .populate('customer')
      .populate('user', 'name username')
      .populate('items.product');
    
    res.status(200).json(updatedSale);
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Error updating sale status:', error);
    res.status(500).json({ message: 'Server error updating sale status' });
  }
};

// Get sales report
exports.getSalesReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const query = {};
    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    
    const sales = await Sale.find(query)
      .populate('customer', 'name')
      .populate('user', 'name')
      .sort({ createdAt: -1 });
      
    const totalSales = sales.reduce((sum, sale) => sum + sale.total, 0);
    const totalItems = sales.reduce((sum, sale) => {
      return sum + sale.items.reduce((itemSum, item) => itemSum + item.quantity, 0);
    }, 0);
    
    res.json({
      sales,
      summary: {
        totalSales,
        totalItems,
        count: sales.length
      }
    });
  } catch (err) {
    console.error('Error generating sales report:', err.message);
    res.status(500).json({ message: 'Server error generating sales report' });
  }
};
