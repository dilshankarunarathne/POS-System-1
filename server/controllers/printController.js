const PDFDocument = require('pdfkit');
const { Product, Sale, SaleItem, User, Category } = require('../models');
const path = require('path');
const fs = require('fs');

// Generate barcode labels for products
exports.generateProductLabels = async (req, res) => {
  try {
    const { productIds, quantity = 1 } = req.body;
    
    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({ message: 'Product IDs are required' });
    }
    
    // Fetch products
    const products = await Product.findAll({
      where: { id: productIds },
      include: [{ model: Category }]
    });
    
    if (products.length === 0) {
      return res.status(404).json({ message: 'No products found' });
    }
    
    // Create a PDF document
    const doc = new PDFDocument({
      size: [108, 72], // 1.5" x 1" label size (in points)
      margin: 5,
      autoFirstPage: false
    });
    
    // Create labels directory if it doesn't exist
    const labelsDir = path.join(__dirname, '../uploads/labels');
    if (!fs.existsSync(labelsDir)) {
      fs.mkdirSync(labelsDir, { recursive: true });
    }
    
    // Generate unique filename
    const fileName = `labels-${Date.now()}.pdf`;
    const filePath = path.join(labelsDir, fileName);
    
    // Pipe output to file
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);
    
    // Generate labels
    products.forEach(product => {
      for (let i = 0; i < quantity; i++) {
        doc.addPage();
        
        // Draw barcode (in real implementation, you'd use a barcode library)
        doc.fontSize(6).text('BARCODE: ' + product.barcode, 5, 5);
        
        // Product name and price
        doc.fontSize(8).text(product.name, 5, 15, { width: 98 });
        doc.fontSize(10).text(`Rs. ${parseFloat(product.price).toFixed(2)}`, 5, 45, { align: 'right' });
        
        // Category (if available)
        if (product.Category) {
          doc.fontSize(6).text(product.Category.name, 5, 60);
        }
      }
    });
    
    // Finalize PDF
    doc.end();
    
    // When stream is finished, send response
    stream.on('finish', () => {
      res.json({
        message: 'Labels generated successfully',
        downloadUrl: `/uploads/labels/${fileName}`
      });
    });
    
  } catch (error) {
    console.error('Error generating labels:', error);
    res.status(500).json({ message: 'Server error while generating labels' });
  }
};

// Generate receipt for a sale
exports.generateReceipt = async (req, res) => {
  try {
    const { saleId } = req.params;
    
    // Fetch sale details
    const sale = await Sale.findByPk(saleId, {
      include: [
        { 
          model: SaleItem, 
          include: [{ model: Product }] 
        },
        { 
          model: User, 
          as: 'cashier',
          attributes: ['id', 'username'] 
        }
      ]
    });
    
    if (!sale) {
      return res.status(404).json({ message: 'Sale not found' });
    }
    
    // Create a PDF document for receipt
    const doc = new PDFDocument({
      size: 'A4',
      margin: 50
    });
    
    // Create receipts directory if it doesn't exist
    const receiptsDir = path.join(__dirname, '../uploads/receipts');
    if (!fs.existsSync(receiptsDir)) {
      fs.mkdirSync(receiptsDir, { recursive: true });
    }
    
    // Generate unique filename
    const fileName = `receipt-${sale.invoiceNumber}.pdf`;
    const filePath = path.join(receiptsDir, fileName);
    
    // Pipe output to file
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);
    
    // Header
    doc.fontSize(20).text('BIKE PARTS SHOP', { align: 'center' });
    doc.fontSize(12).text('123 Main Street, Anytown, AS 12345', { align: 'center' });
    doc.fontSize(12).text('Tel: (123) 456-7890', { align: 'center' });
    doc.moveDown();
    
    // Receipt details
    doc.fontSize(14).text('RECEIPT', { align: 'center' });
    doc.fontSize(10).text(`Invoice #: ${sale.invoiceNumber}`);
    doc.text(`Date: ${new Date(sale.date).toLocaleString()}`);
    doc.text(`Cashier: ${sale.cashier ? sale.cashier.username : 'Unknown'}`);
    if (sale.customerName) {
      doc.text(`Customer: ${sale.customerName}`);
    }
    doc.moveDown();
    
    // Table header
    doc.fontSize(10);
    const tableTop = doc.y;
    doc.text('Item', 50, tableTop);
    doc.text('Qty', 250, tableTop);
    doc.text('Price', 300, tableTop);
    doc.text('Amount', 400, tableTop);
    doc.moveDown();
    
    // Items
    let currentY = doc.y;
    sale.SaleItems.forEach(item => {
      const product = item.Product ? item.Product.name : 'Unknown Product';
      doc.text(product, 50, currentY);
      doc.text(item.quantity.toString(), 250, currentY);
      doc.text(`Rs. ${parseFloat(item.unitPrice).toFixed(2)}`, 300, currentY);
      doc.text(`Rs. ${parseFloat(item.subtotal).toFixed(2)}`, 400, currentY);
      currentY = doc.y + 10;
      doc.y = currentY;
    });
    
    doc.moveDown();
    
    // Totals
    const totalsX = 350;
    doc.text('Subtotal:', totalsX);
    doc.text(`Rs. ${parseFloat(sale.subtotal).toFixed(2)}`, 450);
    
    if (sale.discount > 0) {
      doc.text('Discount:', totalsX);
      doc.text(`Rs. ${parseFloat(sale.discount).toFixed(2)}`, 450);
    }
    
    if (sale.tax > 0) {
      doc.text('Tax:', totalsX);
      doc.text(`Rs. ${parseFloat(sale.tax).toFixed(2)}`, 450);
    }
    
    doc.text('Total:', totalsX);
    doc.text(`Rs. ${parseFloat(sale.total).toFixed(2)}`, 450, { underline: true });
    doc.moveDown();
    
    // Payment method
    doc.text(`Payment Method: ${sale.paymentMethod.replace('_', ' ').toUpperCase()}`);
    
    // Footer
    doc.fontSize(10).text('Thank you for your business!', { align: 'center' });
    
    // Finalize PDF
    doc.end();
    
    // When stream is finished, send response
    stream.on('finish', () => {
      res.json({
        message: 'Receipt generated successfully',
        downloadUrl: `/uploads/receipts/${fileName}`
      });
    });
    
  } catch (error) {
    console.error('Error generating receipt:', error);
    res.status(500).json({ message: 'Server error while generating receipt' });
  }
}; 