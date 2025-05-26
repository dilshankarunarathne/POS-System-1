const mongoose = require('mongoose');
const Sale = require('../models/Sale');
const SaleItem = require('../models/SaleItem');
const Product = require('../models/Product');
const User = require('../models/User');
const Customer = require('../models/Customer');
const printController = require('./printController');

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
const createSale = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const {
      customer,
      customerName,
      customerPhone,
      items,
      subtotal,
      discount = 0,
      tax = 0,
      total,
      paymentMethod,
      notes
    } = req.body;
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: 'Sale items are required' });
    }
    
    // Generate invoice number
    const invoiceNumber = await generateInvoiceNumber();
    
    // Create customer if customerName is provided but no customer ID
    let customerId = customer;
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
    
    // Create new sale
    const sale = new Sale({
      invoiceNumber,
      customer: customerId,
      items: [],
      subtotal,
      discount,
      tax,
      total,
      paymentMethod,
      user: req.user.id,
      notes,
      createdAt: new Date()
    });
    
    // Process items and update product stock
    for (const item of items) {
      // Check if product exists and has enough stock
      const product = await Product.findById(item.product || item.productId).session(session);
      
      if (!product) {
        await session.abortTransaction();
        session.endSession();
        return res.status(404).json({ message: `Product with ID ${item.product || item.productId} not found` });
      }
      
      if (product.quantity < item.quantity) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ 
          message: `Insufficient stock for product: ${product.name}`,
          product: product.name,
          available: product.quantity,
          requested: item.quantity
        });
      }
      
      // Add item to sale
      sale.items.push({
        product: product._id,
        quantity: item.quantity,
        price: item.price,
        discount: item.discount || 0
      });
      
      // Update product stock
      product.quantity -= item.quantity;
      await product.save({ session });
    }
    
    // Save the sale
    await sale.save({ session });
    
    // Commit transaction
    await session.commitTransaction();
    session.endSession();
    
    // Return created sale with populated fields
    const createdSale = await Sale.findById(sale._id)
      .populate('customer')
      .populate('user', 'name username')
      .populate('items.product');
    
    res.status(201).json(createdSale);
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Error creating sale:', error);
    res.status(500).json({ message: 'Server error creating sale' });
  }
};

// Get all sales with pagination and filtering
const getAllSales = async (req, res) => {
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
    
    // Transform MongoDB documents with consistent structure
    const transformedSales = sales.map(sale => {
      const saleObj = sale.toObject();
      saleObj.id = saleObj._id; // Add id field for frontend compatibility
      
      // Add cashier info from user if available
      if (saleObj.user && !saleObj.cashier) {
        saleObj.cashier = {
          id: saleObj.user._id,
          username: saleObj.user.username || saleObj.user.name || 'Unknown'
        };
      }
      
      // Make sure sale date is correctly set
      if (!saleObj.date) {
        saleObj.date = saleObj.createdAt;
      }
      
      return saleObj;
    });
    
    // Get total count for pagination
    const totalSales = await Sale.countDocuments(filter);
    
    res.status(200).json({
      sales: transformedSales,
      totalPages: Math.ceil(totalSales / Number(limit)),
      currentPage: Number(page),
      totalSales
    });
  } catch (error) {
    console.error('Error fetching sales:', error);
    res.status(500).json({ message: 'Server error fetching sales' });
  }
};

// Get a single sale by ID with all details
const getSaleById = async (req, res) => {
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
      .populate({
        path: 'items.product',
        select: 'name price sku barcode'
      })
      .populate('customer')
      .populate('user', 'name username');
    
    if (!sale) {
      return res.status(404).json({ message: 'Sale not found' });
    }
    
    // Transform MongoDB document with consistent structure
    const saleObj = sale.toObject();
    saleObj.id = saleObj._id; // Add id field for frontend compatibility
    
    // Add cashier info from user if available
    if (saleObj.user && !saleObj.cashier) {
      saleObj.cashier = {
        id: saleObj.user._id,
        username: saleObj.user.username || saleObj.user.name || 'Unknown'
      };
    }
    
    // Make sure sale date is correctly set
    if (!saleObj.date) {
      saleObj.date = saleObj.createdAt;
    }
    
    // Ensure each item has the calculated subtotal
    if (saleObj.items && Array.isArray(saleObj.items)) {
      saleObj.items = saleObj.items.map(item => {
        // Add unique identifier for each item
        item.id = item._id;
        // Calculate subtotal if not already present
        if (!item.subtotal) {
          item.subtotal = item.price * item.quantity;
        }
        // Make sure product information is consistent
        if (item.product) {
          item.product.id = item._id;
        }
        return item;
      });
      
      // Add legacy SaleItems field for frontend compatibility
      saleObj.SaleItems = saleObj.items.map(item => ({
        id: item._id.toString(),
        productId: item.product?._id.toString(),
        quantity: item.quantity,
        unitPrice: item.price,
        price: item.price,
        discount: item.discount || 0,
        subtotal: item.price * item.quantity,
        Product: {
          id: item.product?._id.toString(),
          name: item.product?.name || 'Unknown',
          barcode: item.product?.barcode || item.product?.sku || ''
        }
      }));
    }
    
    res.status(200).json(saleObj);
  } catch (error) {
    console.error('Error fetching sale:', error);
    res.status(500).json({ message: 'Server error fetching sale details' });
  }
};

// Update sale status (for returns or cancellations)
const updateSaleStatus = async (req, res) => {
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
const getSalesReport = async (req, res) => {
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
  } catch (error) {
    console.error('Error generating sales report:', error);
    res.status(500).json({ message: 'Server error generating sales report' });
  }
};

// Generate receipt
const generateReceipt = async (req, res) => {
  // Forward to the printController
  return printController.generateReceipt(req, res);
};

module.exports = {
  createSale,
  getAllSales,
  getSaleById,
  updateSaleStatus,
  getSalesReport,
  generateReceipt
};