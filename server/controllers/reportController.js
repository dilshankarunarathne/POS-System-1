const Sale = require('../models/Sale');
const Product = require('../models/Product');
const mongoose = require('mongoose');

// Get sales summary report
const getSalesSummary = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // Default to last 30 days if no dates provided
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();
    
    // Set end date to end of day
    end.setHours(23, 59, 59, 999);

    // Query sales within date range
    const sales = await Sale.find({
      createdAt: { $gte: start, $lte: end }
    });

    // Calculate summary statistics
    const totalSales = sales.length;
    const revenue = sales.reduce((sum, sale) => sum + sale.total, 0);
    const avgSale = totalSales > 0 ? revenue / totalSales : 0;
    
    // Group by payment method
    const paymentMethods = {};
    sales.forEach(sale => {
      if (!paymentMethods[sale.paymentMethod]) {
        paymentMethods[sale.paymentMethod] = 0;
      }
      paymentMethods[sale.paymentMethod] += sale.total;
    });

    res.status(200).json({
      startDate: start,
      endDate: end,
      totalSales,
      revenue,
      avgSale,
      paymentMethods
    });
  } catch (error) {
    console.error('Error generating sales summary:', error);
    res.status(500).json({ message: 'Server error generating report' });
  }
};

// Get product sales report
const getProductSalesReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // Default to last 30 days if no dates provided
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();
    
    // Set end date to end of day
    end.setHours(23, 59, 59, 999);

    // Aggregate product sales
    const productSales = await Sale.aggregate([
      {
        $match: { 
          createdAt: { $gte: start, $lte: end }
        }
      },
      {
        $unwind: '$items'
      },
      {
        $group: {
          _id: '$items.product',
          totalQuantity: { $sum: '$items.quantity' },
          totalRevenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } }
        }
      },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product'
        }
      },
      {
        $unwind: '$product'
      },
      {
        $project: {
          productName: '$product.name',
          sku: '$product.sku',
          totalQuantity: 1,
          totalRevenue: 1,
          averagePrice: { $divide: ['$totalRevenue', '$totalQuantity'] }
        }
      },
      {
        $sort: { totalQuantity: -1 }
      }
    ]);

    res.status(200).json({
      startDate: start,
      endDate: end,
      products: productSales
    });
  } catch (error) {
    console.error('Error generating product sales report:', error);
    res.status(500).json({ message: 'Server error generating report' });
  }
};

// Get inventory status report
const getInventoryStatusReport = async (req, res) => {
  try {
    // Get all products with their stock levels
    const products = await Product.find().populate('category');

    // Calculate inventory statistics
    const totalProducts = products.length;
    const totalInventoryValue = products.reduce((sum, product) => {
      return sum + (product.cost * product.quantity);
    }, 0);
    
    const lowStockThreshold = 10; // Define low stock threshold
    const lowStockItems = products.filter(product => product.quantity <= lowStockThreshold);
    
    const outOfStock = products.filter(product => product.quantity === 0);

    res.status(200).json({
      totalProducts,
      totalInventoryValue,
      lowStockItems: {
        count: lowStockItems.length,
        items: lowStockItems.map(item => ({
          id: item._id,
          name: item.name,
          sku: item.sku,
          quantity: item.quantity,
          category: item.category?.name || 'Uncategorized'
        }))
      },
      outOfStockCount: outOfStock.length
    });
  } catch (error) {
    console.error('Error generating inventory report:', error);
    res.status(500).json({ message: 'Server error generating report' });
  }
};

// Generate PDF sales report - stub function
const generateSalesReport = async (req, res) => {
  try {
    // In a real implementation, you would:
    // 1. Generate the data similar to getSalesSummary
    // 2. Use a PDF library like PDFKit to create a PDF
    // 3. Stream the PDF to the response
    
    res.status(200).json({ 
      message: 'PDF report functionality will be implemented here',
      note: 'This would generate and return a PDF in a complete implementation'
    });
  } catch (error) {
    console.error('Error generating PDF report:', error);
    res.status(500).json({ message: 'Server error generating PDF report' });
  }
};

module.exports = {
  getSalesSummary,
  getProductSalesReport,
  getInventoryStatusReport,
  generateSalesReport
};