const Sale = require('../models/Sale');
const Product = require('../models/Product');
const mongoose = require('mongoose');

// Create a new sale
exports.createSale = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { items, ...saleData } = req.body;
    
    // Create the sale first
    const newSale = new Sale({
      ...saleData,
      items
    });
    
    await newSale.save({ session });
    
    // Update inventory for each product
    for (const item of items) {
      await Product.updateOne(
        { _id: item.product },
        { $inc: { quantity: -item.quantity } },
        { session }
      );
    }
    
    await session.commitTransaction();
    session.endSession();
    
    // Return the sale with populated items
    const completeSale = await Sale.findById(newSale._id)
      .populate('customer', 'name')
      .populate('user', 'name')
      .populate('items.product', 'name sku');
      
    res.status(201).json(completeSale);
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// Get all sales
exports.getSales = async (req, res) => {
  try {
    const sales = await Sale.find()
      .populate('customer', 'name')
      .populate('user', 'name')
      .sort({ createdAt: -1 });
    res.json(sales);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// Get sale by id
exports.getSaleById = async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.id)
      .populate('customer', 'name email phone')
      .populate('user', 'name')
      .populate('items.product', 'name sku price');
      
    if (!sale) {
      return res.status(404).json({ msg: 'Sale not found' });
    }
    
    res.json(sale);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
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
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};
