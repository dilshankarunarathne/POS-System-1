const Sale = require('../models/Sale');
const Product = require('../models/Product');  // Make sure this exists
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

    // Base match condition with shop filter
    const matchCondition = { 
      createdAt: { $gte: start, $lte: end },
      status: { $ne: 'cancelled' }, // Exclude cancelled sales
      shopId: new mongoose.Types.ObjectId(req.user.shopId._id)
    };

    // Aggregate sales by day
    const dailySalesAggregation = await Sale.aggregate([
      {
        $match: matchCondition
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
        $match: matchCondition
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
        $match: matchCondition
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

    // Base match condition with shop filter
    const matchCondition = { 
      createdAt: { $gte: start, $lte: end },
      status: { $ne: 'cancelled' },
      shopId: new mongoose.Types.ObjectId(req.user.shopId._id)
    };

    // Aggregate daily sales
    const dailySales = await Sale.aggregate([
      {
        $match: matchCondition
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
    const { startDate, endDate, categoryId, limit = 10 } = req.query;

    // Default to last 30 days if no dates provided
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();
    
    // Set end date to end of day
    end.setHours(23, 59, 59, 999);

    // Base match condition with shop filter
    const matchCondition = { 
      createdAt: { $gte: start, $lte: end },
      shopId: new mongoose.Types.ObjectId(req.user.shopId._id)
    };

    // Add category filter if provided
    const categoryFilter = {};
    if (categoryId) {
      categoryFilter['product.category'] = new mongoose.Types.ObjectId(categoryId);
    }

    // Aggregate product sales
    const productSales = await Sale.aggregate([
      {
        $match: matchCondition
      },
      {
        $unwind: '$items'
      },
      {
        $lookup: {
          from: 'products',
          localField: 'items.product',
          foreignField: '_id',
          as: 'productInfo'
        }
      },
      {
        $unwind: {
          path: '$productInfo',
          preserveNullAndEmptyArrays: false // Skip items with no matching product
        }
      },
      {
        $lookup: {
          from: 'categories',
          localField: 'productInfo.category',
          foreignField: '_id',
          as: 'categoryInfo'
        }
      },
      {
        $unwind: {
          path: '$categoryInfo',
          preserveNullAndEmptyArrays: true
        }
      },
      // Apply category filter if provided
      ...(categoryId ? [{ $match: categoryFilter }] : []),
      {
        $group: {
          _id: '$productInfo._id',
          name: { $first: '$productInfo.name' },
          category: { $first: { $ifNull: ['$categoryInfo.name', 'Uncategorized'] } },
          quantitySold: { $sum: '$items.quantity' },
          totalRevenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
          // Calculate profit based on cost price and selling price
          profit: { 
            $sum: { 
              $multiply: [
                { $subtract: ['$items.price', { $ifNull: ['$productInfo.cost', 0] }] },
                '$items.quantity'
              ] 
            } 
          }
        }
      },
      {
        $project: {
          _id: 0,
          name: 1,
          category: 1,
          quantitySold: 1,
          totalRevenue: { $round: ['$totalRevenue', 2] },
          profit: { $round: ['$profit', 2] },
          profitMargin: { 
            $concat: [
              { 
                $toString: { 
                  $round: [
                    { 
                      $multiply: [
                        { 
                          $cond: [
                            { $eq: ['$totalRevenue', 0] },
                            0,
                            { $divide: ['$profit', '$totalRevenue'] }
                          ]
                        }, 
                        100
                      ] 
                    },
                    1
                  ] 
                } 
              },
              '%'
            ]
          }
        }
      },
      {
        $sort: { totalRevenue: -1 }
      },
      {
        $limit: parseInt(limit)
      }
    ]);

    // Return the array directly instead of wrapping in an object
    res.status(200).json(productSales);
    
  } catch (error) {
    console.error('Error generating product sales report:', error);
    res.status(500).json({ message: 'Server error generating report' });
  }
};

// Get inventory status report - make sure this function is correctly exported
const getInventoryStatusReport = async (req, res) => {
  try {
    const { lowStock, categoryId } = req.query;
    const shopId = req.query.shopId || req.user.shopId;

    if (!shopId) {
      return res.status(400).json({ message: 'Shop ID is required' });
    }

    // Build filter condition
    const filter = { shopId: new mongoose.Types.ObjectId(shopId) };
    
    // Add category filter if provided
    if (categoryId) {
      filter.category = new mongoose.Types.ObjectId(categoryId);
    }
    
    // Add low stock filter if requested
    if (lowStock === 'true') {
      filter.$expr = { $lte: ["$quantity", "$reorderLevel"] };
    }
    
    const products = await Product.find(filter)
      .populate('category', 'name')
      .lean();
    
    // Transform products for the report
    const inventoryItems = products.map(product => ({
      name: product.name,
      category: product.category ? product.category.name : 'Uncategorized',
      quantity: product.quantity || 0,
      reorderLevel: product.reorderLevel || 10,
      value: ((product.cost || 0) * (product.quantity || 0)).toFixed(2),
      barcode: product.barcode || product.sku || ''
    }));
    
    // Calculate summary statistics
    const summary = {
      totalProducts: inventoryItems.length,
      totalItems: inventoryItems.reduce((sum, item) => sum + item.quantity, 0),
      totalValue: inventoryItems.reduce((sum, item) => sum + parseFloat(item.value), 0).toFixed(2),
      lowStockItems: inventoryItems.filter(item => item.quantity <= item.reorderLevel).length
    };
    
    res.status(200).json({
      inventory: inventoryItems,
      summary
    });
    
  } catch (error) {
    console.error('Error generating inventory status report:', error);
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