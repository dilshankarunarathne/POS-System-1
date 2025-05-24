const Sale = require('../models/Sale');
const Product = require('../models/Product');
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');

// Generate product labels with proper QR code implementation
const generateProductLabels = async (req, res) => {
  try {
    const { productIds, quantity = 1 } = req.body;
    
    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({ message: 'Product IDs are required' });
    }
    
    // Find products by IDs
    const products = await Product.find({ _id: { $in: productIds } })
      .populate('category');
    
    if (!products || products.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'No products found with the provided IDs' 
      });
    }
    
    console.log(`Found ${products.length} products for label generation`);
    
    // Create a PDF document
    const doc = new PDFDocument({ size: 'A4', margin: 10 });
    
    // Set the response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=product-labels-${Date.now()}.pdf`);
    
    // Pipe the PDF directly to the response
    doc.pipe(res);
    
    // Set up document layout for smaller labels
    let x = 15;
    let y = 15;
    const labelWidth = 100;  // Reduced width for smaller labels
    const labelHeight = 70;  // Reduced height for smaller labels
    const colsPerPage = 5;   // More columns due to smaller width
    const rowsPerPage = 10;  // More rows due to smaller height
    

    // Generate labels for each product
    for (const product of products) {
      for (let i = 0; i < quantity; i++) {
        // Check if we need to move to next row or page
        if (x > 15 + (colsPerPage - 1) * labelWidth) {
          x = 15;
          y += labelHeight;
          
          if (y > 15 + (rowsPerPage - 1) * labelHeight) {
            y = 15;
            doc.addPage();
          }
        }
        
        // Draw label border
        doc.rect(x, y, labelWidth - 5, labelHeight - 5)
           .stroke();
        
        // Add product information - compact version for small labels
        doc.fontSize(6)
           .text(product.name, x + 3, y + 3, { width: labelWidth - 8 });
        
        doc.fontSize(5)
           .text(`Rs. ${product.price?.toFixed(2) || '0.00'}`, x + 3, y + 10);
        
        if (product.barcode) {
          doc.fontSize(4)
             .text(`${product.barcode}`, x + 3, y + 16);
        }
        
        // Create QR code data - simplified for small labels
        const qrData = {
          id: product.barcode,
          price: product.price
        };
        
        // Generate QR code as data URL - smaller size
        try {
          const qrDataUrl = await QRCode.toDataURL(JSON.stringify(qrData), {
            errorCorrectionLevel: 'L', // Lower correction level for smaller codes
            margin: 0,
            width: 50
          });
          
          // Add QR code to label - smaller and repositioned
          doc.image(qrDataUrl, x + 25, y + 20, { width: 40 });
          
        } catch (qrErr) {
          console.error('Error generating QR code:', qrErr);
          // If QR code fails, add a note
          doc.fontSize(5)
             .text('QR unavailable', x + 3, y + 30);
        }
        
        // Move to next label position
        x += labelWidth;
      }
    }
    
    // Finalize the PDF and send to client
    doc.end();
  } catch (error) {
    console.error('Error generating labels:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error generating labels',
      error: error.message
    });
  }
};

// Generate receipt for a sale
const generateReceipt = async (req, res) => {
  try {
    const { saleId } = req.params;
    
    const sale = await Sale.findById(saleId)
      .populate('customer')
      .populate('user', 'name')
      .populate('items.product');
      
    if (!sale) {
      return res.status(404).json({ message: 'Sale not found' });
    }
    
    // Create a PDF document for the receipt
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    
    // Set the response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=receipt-${sale.invoiceNumber || saleId}.pdf`);
    
    // Pipe the PDF directly to the response
    doc.pipe(res);
    
    // Add receipt header
    doc.fontSize(18).text('SALES RECEIPT', { align: 'center' });
    doc.moveDown();
    
    // Add receipt details
    doc.fontSize(12).text(`Receipt #: ${sale.invoiceNumber || saleId}`);
    doc.text(`Date: ${new Date(sale.createdAt).toLocaleString()}`);
    doc.text(`Customer: ${sale.customer ? sale.customer.name : 'Walk-in Customer'}`);
    doc.text(`Cashier: ${sale.user ? sale.user.name : 'Unknown'}`);
    doc.moveDown();
    
    // Add items table
    doc.fontSize(10).text('Items:', { underline: true });
    doc.moveDown(0.5);
    
    // Draw items
    let y = doc.y;
    doc.text('Product', 50, y);
    doc.text('Qty', 250, y);
    doc.text('Price', 300, y);
    doc.text('Total', 380, y);
    doc.moveDown();
    
    // Add line
    y = doc.y;
    doc.moveTo(50, y).lineTo(550, y).stroke();
    doc.moveDown();
    
    // Add items
    sale.items.forEach(item => {
      const productName = item.product ? item.product.name : 'Unknown Product';
      doc.text(productName, 50);
      doc.text(item.quantity.toString(), 250, doc.y);
      doc.text(`Rs. ${item.price.toFixed(2)}`, 300, doc.y);
      doc.text(`Rs. ${(item.quantity * item.price).toFixed(2)}`, 380, doc.y);
      doc.moveDown(0.5);
    });
    
    // Add line
    y = doc.y;
    doc.moveTo(50, y).lineTo(550, y).stroke();
    doc.moveDown();
    
    // Add totals
    doc.text('', 50);
    doc.text('Subtotal:', 300);
    doc.text(`Rs. ${sale.subtotal.toFixed(2)}`, 380);
    doc.moveDown(0.5);
    
    if (sale.discount > 0) {
      doc.text('', 50);
      doc.text('Discount:', 300);
      doc.text(`Rs. ${sale.discount.toFixed(2)}`, 380);
      doc.moveDown(0.5);
    }
    
    if (sale.tax > 0) {
      doc.text('', 50);
      doc.text('Tax:', 300);
      doc.text(`Rs. ${sale.tax.toFixed(2)}`, 380);
      doc.moveDown(0.5);
    }
    
    // Add line
    y = doc.y;
    doc.moveTo(300, y).lineTo(550, y).stroke();
    doc.moveDown(0.5);
    
    // Add grand total
    doc.fontSize(12).text('', 50);
    doc.text('TOTAL:', 300);
    doc.text(`Rs. ${sale.total.toFixed(2)}`, 380);
    doc.moveDown();
    
    // Add payment method
    doc.fontSize(10).text(`Payment Method: ${sale.paymentMethod.toUpperCase()}`);
    doc.moveDown();
    
    // Add footer
    doc.fontSize(10).text('Thank you for your business!', { align: 'center' });
    doc.moveDown();
    doc.text('Return policy: Items can be returned within 7 days with receipt', { align: 'center' });
    
    // Finalize the PDF and send to client
    doc.end();
  } catch (error) {
    console.error('Error generating receipt:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error generating receipt',
      error: error.message
    });
  }
};

module.exports = {
  generateProductLabels,
  generateReceipt
};