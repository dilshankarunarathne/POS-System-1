const { Sale, SaleItem, Product, Category, User, sequelize } = require('../models');
const { Op } = require('sequelize');
const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

// Helper to format currency
const formatCurrency = (amount) => {
  return parseFloat(amount).toFixed(2);
};

// Get sales summary by date range
exports.getSalesSummary = async (req, res) => {
  try {
    const { startDate, endDate, groupBy = 'day' } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Start and end dates are required' });
    }
    
    // Validate date format and grouping option
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ message: 'Invalid date format' });
    }
    
    if (!['day', 'week', 'month'].includes(groupBy)) {
      return res.status(400).json({ message: 'Invalid groupBy parameter' });
    }
    
    // SQL fragment for grouping by day, week, or month depends on the database
    let dateGroup;
    
    if (groupBy === 'day') {
      dateGroup = "DATE(date)";
    } else if (groupBy === 'week') {
      dateGroup = "DATE_TRUNC('week', date)";
    } else if (groupBy === 'month') {
      dateGroup = "DATE_TRUNC('month', date)";
    }
    
    // Query to get sales summary grouped by date
    const salesSummary = await Sale.findAll({
      attributes: [
        [sequelize.literal(`${dateGroup}`), 'date'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'totalSales'],
        [sequelize.fn('SUM', sequelize.col('subtotal')), 'subtotal'],
        [sequelize.fn('SUM', sequelize.col('discount')), 'discount'],
        [sequelize.fn('SUM', sequelize.col('tax')), 'tax'],
        [sequelize.fn('SUM', sequelize.col('total')), 'total'],
      ],
      where: {
        date: {
          [Op.between]: [start, end]
        },
        status: 'completed' // Only count completed sales
      },
      group: [sequelize.literal(`${dateGroup}`)],
      order: [sequelize.literal(`${dateGroup}`)],
      raw: true
    });
    
    // Format response data
    const formattedSummary = salesSummary.map(item => ({
      date: item.date,
      totalSales: parseInt(item.totalSales),
      subtotal: formatCurrency(item.subtotal),
      discount: formatCurrency(item.discount),
      tax: formatCurrency(item.tax),
      total: formatCurrency(item.total),
    }));
    
    // Calculate totals
    const totals = {
      totalSales: formattedSummary.reduce((sum, item) => sum + item.totalSales, 0),
      subtotal: formatCurrency(formattedSummary.reduce((sum, item) => sum + parseFloat(item.subtotal), 0)),
      discount: formatCurrency(formattedSummary.reduce((sum, item) => sum + parseFloat(item.discount), 0)),
      tax: formatCurrency(formattedSummary.reduce((sum, item) => sum + parseFloat(item.tax), 0)),
      total: formatCurrency(formattedSummary.reduce((sum, item) => sum + parseFloat(item.total), 0)),
    };
    
    res.json({
      summary: formattedSummary,
      totals
    });
  } catch (error) {
    console.error('Error generating sales summary:', error);
    res.status(500).json({ message: 'Server error while generating sales summary' });
  }
};

// Get product sales report
exports.getProductSalesReport = async (req, res) => {
  try {
    const { startDate, endDate, categoryId, limit = 10 } = req.query;
    
    // Prepare date filter
    const dateFilter = {};
    if (startDate && endDate) {
      dateFilter.date = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    } else if (startDate) {
      dateFilter.date = {
        [Op.gte]: new Date(startDate)
      };
    } else if (endDate) {
      dateFilter.date = {
        [Op.lte]: new Date(endDate)
      };
    }
    
    // Add status filter to only include completed sales
    dateFilter.status = 'completed';
    
    // Prepare category filter
    const categoryFilter = {};
    if (categoryId) {
      categoryFilter.categoryId = categoryId;
    }
    
    // Query for product sales summary
    const productSales = await SaleItem.findAll({
      attributes: [
        'productId',
        [sequelize.fn('SUM', sequelize.col('quantity')), 'quantitySold'],
        [sequelize.fn('SUM', sequelize.col('subtotal')), 'totalRevenue'],
      ],
      include: [
        {
          model: Sale,
          attributes: [],
          where: dateFilter,
          required: true
        },
        {
          model: Product,
          attributes: ['name', 'barcode', 'price', 'costPrice'],
          where: categoryFilter,
          required: true,
          include: [{
            model: Category,
            attributes: ['name']
          }]
        }
      ],
      group: ['productId', 'Product.id', 'Product.Category.id'],
      order: [[sequelize.literal('quantitySold'), 'DESC']],
      limit: parseInt(limit),
      subQuery: false
    });
    
    // Format response data with profit calculation
    const formattedProductSales = productSales.map(item => {
      const itemData = item.toJSON();
      const product = itemData.Product;
      const revenue = parseFloat(itemData.totalRevenue);
      const quantitySold = parseInt(itemData.quantitySold);
      const costPrice = parseFloat(product.costPrice);
      const totalCost = costPrice * quantitySold;
      const profit = revenue - totalCost;
      const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;
      
      return {
        productId: itemData.productId,
        name: product.name,
        barcode: product.barcode,
        category: product.Category ? product.Category.name : 'Uncategorized',
        quantitySold,
        unitPrice: formatCurrency(product.price),
        totalRevenue: formatCurrency(revenue),
        totalCost: formatCurrency(totalCost),
        profit: formatCurrency(profit),
        profitMargin: profitMargin.toFixed(2) + '%'
      };
    });
    
    res.json(formattedProductSales);
  } catch (error) {
    console.error('Error generating product sales report:', error);
    res.status(500).json({ message: 'Server error while generating product sales report' });
  }
};

// Get inventory status report
exports.getInventoryStatusReport = async (req, res) => {
  try {
    const { lowStock, categoryId, sort = 'stockQuantity', order = 'ASC' } = req.query;
    
    // Prepare filters
    const whereConditions = {};
    
    // Add category filter if provided
    if (categoryId) {
      whereConditions.categoryId = categoryId;
    }
    
    // Add low stock filter if requested
    if (lowStock === 'true') {
      whereConditions.stockQuantity = {
        [Op.lte]: sequelize.col('reorderLevel')
      };
    }
    
    // Query products for inventory report
    const products = await Product.findAll({
      where: whereConditions,
      include: [
        { model: Category, attributes: ['name'] },
      ],
      order: [[sort, order]]
    });
    
    // Format response data
    const formattedInventory = products.map(product => {
      const productData = product.toJSON();
      const stockStatus = productData.stockQuantity <= productData.reorderLevel ? 'Low' : 'Adequate';
      
      return {
        id: productData.id,
        name: productData.name,
        barcode: productData.barcode,
        category: productData.Category ? productData.Category.name : 'Uncategorized',
        stockQuantity: productData.stockQuantity,
        reorderLevel: productData.reorderLevel,
        stockStatus,
        value: formatCurrency(productData.stockQuantity * productData.costPrice)
      };
    });
    
    // Calculate totals
    const totalProducts = formattedInventory.length;
    const totalItems = formattedInventory.reduce((sum, item) => sum + item.stockQuantity, 0);
    const totalValue = formatCurrency(formattedInventory.reduce(
      (sum, item) => sum + (item.stockQuantity * parseFloat(item.value)), 0
    ));
    const lowStockItems = formattedInventory.filter(item => item.stockStatus === 'Low').length;
    
    res.json({
      inventory: formattedInventory,
      summary: {
        totalProducts,
        totalItems,
        totalValue,
        lowStockItems
      }
    });
  } catch (error) {
    console.error('Error generating inventory report:', error);
    res.status(500).json({ message: 'Server error while generating inventory report' });
  }
};

// Generate a PDF sales report
exports.generateSalesReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Start and end dates are required' });
    }
    
    // Validate date format
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ message: 'Invalid date format' });
    }
    
    // Fetch sales data
    const sales = await Sale.findAll({
      where: {
        date: {
          [Op.between]: [start, end]
        },
        status: 'completed'
      },
      include: [
        { model: User, as: 'cashier', attributes: ['username'] },
      ],
      order: [['date', 'ASC']]
    });
    
    // Prepare summary data
    const totalSales = sales.length;
    const totalRevenue = sales.reduce((sum, sale) => sum + parseFloat(sale.total), 0);
    const totalDiscount = sales.reduce((sum, sale) => sum + parseFloat(sale.discount), 0);
    const totalTax = sales.reduce((sum, sale) => sum + parseFloat(sale.tax), 0);
    
    // Group sales by payment method
    const paymentMethods = {};
    sales.forEach(sale => {
      const method = sale.paymentMethod;
      if (!paymentMethods[method]) {
        paymentMethods[method] = {
          count: 0,
          total: 0
        };
      }
      paymentMethods[method].count += 1;
      paymentMethods[method].total += parseFloat(sale.total);
    });
    
    // Create a PDF document
    const doc = new PDFDocument({
      margin: 50
    });
    
    // Create reports directory if it doesn't exist
    const reportsDir = path.join(__dirname, '../uploads/reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    
    // Generate unique filename
    const fileName = `sales-report-${startDate}-to-${endDate}.pdf`.replace(/:/g, '-');
    const filePath = path.join(reportsDir, fileName);
    
    // Pipe output to file
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);
    
    // Header
    doc.fontSize(20).text('BIKE PARTS SHOP', { align: 'center' });
    doc.fontSize(16).text('Sales Report', { align: 'center' });
    doc.fontSize(12).text(`Period: ${start.toLocaleDateString()} to ${end.toLocaleDateString()}`, { align: 'center' });
    doc.moveDown();
    
    // Summary section
    doc.fontSize(14).text('Sales Summary');
    doc.fontSize(10);
    doc.text(`Total Sales: ${totalSales}`);
    doc.text(`Total Revenue: Rs. ${formatCurrency(totalRevenue)}`);
    doc.text(`Total Discounts: Rs. ${formatCurrency(totalDiscount)}`);
    doc.text(`Total Tax: Rs. ${formatCurrency(totalTax)}`);
    doc.moveDown();
    
    // Payment Methods
    doc.fontSize(14).text('Payment Methods');
    doc.fontSize(10);
    
    Object.keys(paymentMethods).forEach(method => {
      const { count, total } = paymentMethods[method];
      const formattedMethod = method.replace('_', ' ').toUpperCase();
      doc.text(`${formattedMethod}: ${count} sales, Rs. ${formatCurrency(total)}`);
    });
    
    doc.moveDown();
    
    // Sales Details Table
    doc.fontSize(14).text('Sales Details');
    doc.moveDown();
    
    // Table header
    const tableTop = doc.y;
    const tableHeaders = ['Date', 'Invoice #', 'Cashier', 'Subtotal', 'Discount', 'Tax', 'Total'];
    const columnWidths = [80, 90, 70, 70, 70, 70, 70];
    let xPos = 50;
    
    tableHeaders.forEach((header, i) => {
      doc.fontSize(10).text(header, xPos, tableTop, { width: columnWidths[i], align: 'left' });
      xPos += columnWidths[i];
    });
    
    doc.moveTo(50, tableTop + 15).lineTo(520, tableTop + 15).stroke();
    doc.moveDown();
    
    // Table rows
    let rowY = tableTop + 25;
    sales.forEach((sale, i) => {
      const rowData = [
        new Date(sale.date).toLocaleDateString(),
        sale.invoiceNumber,
        sale.cashier ? sale.cashier.username : 'Unknown',
        `Rs. ${formatCurrency(sale.subtotal)}`,
        `Rs. ${formatCurrency(sale.discount)}`,
        `Rs. ${formatCurrency(sale.tax)}`,
        `Rs. ${formatCurrency(sale.total)}`
      ];
      
      xPos = 50;
      rowData.forEach((cell, j) => {
        doc.fontSize(9).text(cell, xPos, rowY, { width: columnWidths[j], align: 'left' });
        xPos += columnWidths[j];
      });
      
      rowY += 20;
      
      // Add a new page if we're near the bottom
      if (rowY > 700) {
        doc.addPage();
        rowY = 50;
      }
    });
    
    // Footer
    doc.fontSize(10).text(`Report generated on ${new Date().toLocaleString()}`, { align: 'center' });
    
    // Finalize PDF
    doc.end();
    
    // When stream is finished, send response
    stream.on('finish', () => {
      res.json({
        message: 'Sales report generated successfully',
        downloadUrl: `/uploads/reports/${fileName}`
      });
    });
    
  } catch (error) {
    console.error('Error generating sales report:', error);
    res.status(500).json({ message: 'Server error while generating sales report' });
  }
}; 