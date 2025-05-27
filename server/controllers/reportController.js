const Sale = require('../models/Sale');
const Product = require('../models/Product');
const mongoose = require('mongoose');

// Get sales summary report
const getSalesSummary = async (req, res) => {
  try {
    const { startDate, endDate, groupBy = 'day' } = req.query;

    // Default to last 30 days if no dates provided
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();
    
    // Set end date to end of day
    end.setHours(23, 59, 59, 999);

    // Format for aggregation
    start.setHours(0, 0, 0, 0);

    // Aggregate sales by day
    const dailySalesAggregation = await Sale.aggregate([
      {
        $match: { 
          createdAt: { $gte: start, $lte: end },
          status: { $ne: 'cancelled' } // Exclude cancelled sales
        }
      },
      {
        $addFields: {
          // Create date field with just the date part for grouping
          saleDate: { 
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } 
          }
        }
      },
      {
        $group: {
          _id: "$saleDate",
          total: { $sum: "$total" },
          salesCount: { $sum: 1 },
          itemCount: { $sum: { $size: "$items" } }
        }
      },
      {
        $sort: { _id: 1 } // Sort by date
      },
      {
        $project: {
          _id: 0,
          date: "$_id",
          total: { $round: ["$total", 2] },
          salesCount: 1,
          itemCount: 1
        }
      }
    ]);

    // Get total sales within period
    const totalStats = await Sale.aggregate([
      {
        $match: { 
          createdAt: { $gte: start, $lte: end },
          status: { $ne: 'cancelled' }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$total" },
          subtotal: { $sum: "$subtotal" },
          tax: { $sum: "$tax" },
          discount: { $sum: "$discount" },
          totalSales: { $sum: 1 },
          totalItems: { $sum: { $size: "$items" } }
        }
      },
      {
        $project: {
          _id: 0,
          total: { $round: ["$total", 2] },
          subtotal: { $round: ["$subtotal", 2] },
          tax: { $round: ["$tax", 2] },
          discount: { $round: ["$discount", 2] },
          totalSales: 1,
          totalItems: 1,
          averageSale: { $round: [{ $divide: ["$total", "$totalSales"] }, 2] }
        }
      }
    ]);
    
    // Group by payment methods
    const paymentMethodStats = await Sale.aggregate([
      {
        $match: { 
          createdAt: { $gte: start, $lte: end },
          status: { $ne: 'cancelled' }
        }
      },
      {
        $group: {
          _id: "$paymentMethod",
          total: { $sum: "$total" },
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          method: "$_id",
          total: { $round: ["$total", 2] },
          count: 1
        }
      }
    ]);

    res.status(200).json({
      startDate: start,
      endDate: end,
      summary: dailySalesAggregation,
      totals: totalStats.length > 0 ? totalStats[0] : {
        total: 0,
        subtotal: 0,
        tax: 0,
        discount: 0,
        totalSales: 0,
        totalItems: 0,
        averageSale: 0
      },
      paymentMethods: paymentMethodStats
    });
  } catch (error) {
    console.error('Error generating sales summary:', error);
    res.status(500).json({ message: 'Server error generating report', error: error.message });
  }
};

// Get daily sales data
const getDailySales = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // Default to last 7 days if no dates provided
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();
    
    // Set end date to end of day
    end.setHours(23, 59, 59, 999);
    start.setHours(0, 0, 0, 0);

    // Aggregate daily sales
    const dailySales = await Sale.aggregate([
      {
        $match: { 
          createdAt: { $gte: start, $lte: end },
          status: { $ne: 'cancelled' }
        }
      },
      {
        $addFields: {
          day: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }
        }
      },
      {
        $group: {
          _id: "$day",
          revenue: { $sum: "$total" },
          transactions: { $sum: 1 },
          items: { $sum: { $size: "$items" } }
        }
      },
      {
        $sort: { _id: 1 }
      },
      {
        $project: {
          date: "$_id",
          revenue: { $round: ["$revenue", 2] },
          transactions: 1,
          items: 1,
          _id: 0
        }
      }
    ]);

    res.status(200).json(dailySales);
  } catch (error) {
    console.error('Error getting daily sales data:', error);
    res.status(500).json({ message: 'Server error getting daily sales', error: error.message });
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
  generateSalesReport,
  getDailySales
};