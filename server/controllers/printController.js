const Sale = require('../models/Sale');
const Product = require('../models/Product');
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
// Remove the escpos requirement since it's not installed
// const escpos = require('escpos');

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
    
    // Create a PDF document with custom size for 38mm x 25mm labels
    // Converting from mm to points (1 mm = 2.83 points)
    const labelWidthPt = 38 * 2.83;  // 38mm in points (≈107pt)
    const labelHeightPt = 25 * 2.83; // 25mm in points (≈71pt)
    const doc = new PDFDocument({ 
      size: [labelWidthPt, labelHeightPt],
      margin: 1, // Minimal margins for thermal printer
      autoFirstPage: false // Don't create first page automatically
    });
    
    // Set the response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=thermal-labels-${Date.now()}.pdf`);
    
    // Pipe the PDF directly to the response
    doc.pipe(res);
    
    // Generate labels for each product
    for (const product of products) {
      for (let i = 0; i < quantity; i++) {
        // Add a new page for each label
        doc.addPage({
          size: [labelWidthPt, labelHeightPt],
          margin: 1
        });
        
        // Define layout areas
        const qrSize = 50; // Reduced QR code size to fit better
        const qrMargin = 15; // Increased margin after QR code
        const textAreaWidth = labelWidthPt - qrSize - qrMargin; // Remaining space for text
        
        // Right side - QR Code (with proper margin from edge)
        const qrX = labelWidthPt - qrSize - qrMargin;
        const qrY = (labelHeightPt - qrSize) / 2; // Center vertically
        
        // Create QR code data
        const qrData = JSON.stringify({
          barcode: product.barcode || ''
        });
        
        // Generate QR code
        try {
          const qrDataUrl = await QRCode.toDataURL(qrData, {
            errorCorrectionLevel: 'M',
            margin: 0,
            width: qrSize * 2, // Higher resolution for better printing
            scale: 1,
            type: 'image/png'
          });
          
          doc.image(qrDataUrl, qrX, qrY, { width: qrSize, height: qrSize });
          
        } catch (qrErr) {
          console.error('Error generating QR code:', qrErr);
          // Fallback: draw a rectangle where QR would be
          doc.rect(qrX, qrY, qrSize, qrSize).stroke();
          doc.fontSize(6).text('QR Error', qrX, qrY + qrSize/2, { 
            width: qrSize, 
            align: 'center' 
          });
        }
        
        // Left side - Rotated text details
        const textStartX = 2;
        const textCenterY = labelHeightPt / 2;
        
        // Save the current state
        doc.save();
        
        // Move to the center of the text area and rotate
        doc.translate(textStartX + 10, textCenterY);
        doc.rotate(-90); // Rotate 90 degrees counter-clockwise
        
        // Calculate available space for all elements
        const totalAvailableHeight = 70; // Height for all elements in rotated space
        const minSpaceForOtherElements = 25; // Minimum space needed for price, barcode, category
        
        // Calculate maximum space that can be allocated to product name
        const maxNameSpace = totalAvailableHeight - minSpaceForOtherElements;
        
        // Dynamically adjust font size based on product name length
        let nameFontSize = 8; // Default font size
        if (product.name.length > 25) nameFontSize = 7;
        if (product.name.length > 35) nameFontSize = 6;
        if (product.name.length > 45) nameFontSize = 5;
        if (product.name.length > 60) nameFontSize = 4;
        if (product.name.length > 80) nameFontSize = 3;
        
        // First, calculate the height that would be taken by the product name
        doc.fontSize(nameFontSize);
        const nameHeight = doc.heightOfString(product.name, {
          width: 70,
          align: 'center'
        });
        
        // Position product name with adjusted font size and wrapping
        doc.fontSize(nameFontSize)
           .font('Helvetica')
           .text(product.name, -35, -8, { 
             width: 70, 
             align: 'center',
             lineGap: 0,
             height: Math.min(nameHeight, maxNameSpace) // Prevent overflow
           });
        
        // Get the actual height used by the product name
        const actualNameHeight = Math.min(nameHeight, maxNameSpace);
        
        // Position price after product name
        const priceY = -8 + actualNameHeight + 2;
        const priceFontSize = 7;
        
        doc.fontSize(priceFontSize)
           .font('Helvetica')
           .text(`Rs. ${product.price?.toFixed(2) || '0.00'}`, -35, priceY, { 
             width: 70, 
             align: 'center',
             lineGap: 0
           });
        
        // Calculate price text height
        const priceHeight = doc.heightOfString(`Rs. ${product.price?.toFixed(2) || '0.00'}`, {
          width: 70,
          fontSize: priceFontSize
        });
        
        // Position barcode (if available) after price
        if (product.barcode) {
          const barcodeFontSize = 5;
          const barcodeY = priceY + priceHeight + 2;
          
          doc.fontSize(barcodeFontSize)
             .text(`${product.barcode}`, -35, barcodeY, { 
               width: 70, 
               align: 'center',
               lineGap: 0
             });
             
          // Calculate barcode text height
          const barcodeHeight = doc.heightOfString(product.barcode, {
            width: 70,
            fontSize: barcodeFontSize
          });
          
          // Position category (if available) after barcode
          if (product.category?.name) {
            const categoryFontSize = 4;
            const categoryY = barcodeY + barcodeHeight + 1;
            
            // Only add category if there's enough space left
            if (categoryY + categoryFontSize < 35) {
              doc.fontSize(categoryFontSize)
                 .text(product.category.name, -35, categoryY, { 
                   width: 70, 
                   align: 'center',
                   lineGap: 0
                 });
            }
          }
        } else if (product.category?.name) {
          // If no barcode, position category directly after price
          const categoryFontSize = 4;
          const categoryY = priceY + priceHeight + 2;
          
          doc.fontSize(categoryFontSize)
             .text(product.category.name, -35, categoryY, { 
               width: 70, 
               align: 'center',
               lineGap: 0
             });
        }
        
        // Restore the previous state (removes rotation and translation)
        doc.restore();
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

// Generate and send receipt as PDF
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
    const doc = new PDFDocument({ size: [226.8, 'auto'], margin: 10 }); // 80mm width for thermal printer
    
    // Set the response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=receipt-${sale.invoiceNumber || saleId}.pdf`);
    
    // Pipe the PDF directly to the response
    doc.pipe(res);
    
    // Add receipt header - optimized for thermal printer width
    doc.fontSize(12).text('SALES RECEIPT', { align: 'center' });
    doc.fontSize(9).text('POS System Shop', { align: 'center' });
    doc.fontSize(8).text('123 Main Street, City', { align: 'center' });
    doc.fontSize(8).text('Tel: 123-456-7890', { align: 'center' });
    
    // Add divider
    doc.moveDown(0.5);
    doc.moveTo(10, doc.y).lineTo(doc.page.width - 10, doc.y).stroke();
    doc.moveDown(0.5);
    
    // Add receipt details
    doc.fontSize(8).text(`Receipt #: ${sale.invoiceNumber || saleId}`);
    doc.text(`Date: ${new Date(sale.createdAt).toLocaleString()}`);
    doc.text(`Customer: ${sale.customer ? sale.customer.name : 'Walk-in Customer'}`);
    doc.text(`Cashier: ${sale.user ? sale.user.name : 'Unknown'}`);
    
    // Add another divider
    doc.moveDown(0.5);
    doc.moveTo(10, doc.y).lineTo(doc.page.width - 10, doc.y).stroke();
    doc.moveDown(0.5);
    
    // Add items table
    doc.fontSize(8).text('Items:', { underline: true });
    doc.moveDown(0.5);
    
    // Define column positions optimized for narrow receipt
    const col1 = 10;  // Product name
    const col2 = 120; // Qty
    const col3 = 140; // Price
    const col4 = 180; // Total
    
    // Table header
    doc.text('Product', col1);
    doc.text('Qty', col2, doc.y - doc.currentLineHeight());
    doc.text('Price', col3, doc.y - doc.currentLineHeight());
    doc.text('Total', col4, doc.y - doc.currentLineHeight());
    doc.moveDown(0.5);
    
    // Add items, handling both manual and regular product items
    sale.items.forEach(item => {
      let productName;
      if (item.isManual) {
        // Use the name field for manual items
        productName = item.name || 'Manual Item';
      } else {
        // Use product name for regular items
        productName = item.product ? item.product.name : 'Unknown Product';
      }
      
      const lineStart = doc.y;
      
      // Handle potentially long product names by limiting width
      doc.fontSize(7).text(productName, col1, lineStart, { width: 110 });
      const lineEnd = doc.y;
      
      // Put the rest of the info on the same vertical position as product name
      doc.text(item.quantity.toString(), col2, lineStart);
      doc.text(`Rs. ${item.price.toFixed(2)}`, col3, lineStart);
      doc.text(`Rs. ${((item.quantity * item.price) - (item.discount || 0)).toFixed(2)}`, col4, lineStart);
      
      // Move down by the amount we need based on how many lines the product name took
      doc.moveDown((lineEnd - lineStart) / doc.currentLineHeight());
    });
    
    // Add divider
    doc.moveDown(0.5);
    doc.moveTo(10, doc.y).lineTo(doc.page.width - 10, doc.y).stroke();
    doc.moveDown(0.5);
    
    // Add totals - right aligned
    doc.fontSize(8);
    const totalsCol1 = 140;
    const totalsCol2 = 180;
    
    doc.text('Subtotal:', totalsCol1);
    doc.text(`Rs. ${sale.subtotal.toFixed(2)}`, totalsCol2, doc.y - doc.currentLineHeight());
    doc.moveDown(0.5);
    
    if (sale.discount > 0) {
      doc.text('Discount:', totalsCol1);
      doc.text(`Rs. ${sale.discount.toFixed(2)}`, totalsCol2, doc.y - doc.currentLineHeight());
      doc.moveDown(0.5);
    }
    
    if (sale.tax > 0) {
      doc.text('Tax:', totalsCol1);
      doc.text(`Rs. ${sale.tax.toFixed(2)}`, totalsCol2, doc.y - doc.currentLineHeight());
      doc.moveDown(0.5);
    }
    
    // Add line for total
    doc.moveTo(totalsCol1, doc.y).lineTo(doc.page.width - 10, doc.y).stroke();
    doc.moveDown(0.5);
    
    // Add grand total
    doc.fontSize(9);
    doc.text('TOTAL:', totalsCol1);
    doc.text(`Rs. ${sale.total.toFixed(2)}`, totalsCol2, doc.y - doc.currentLineHeight());
    doc.moveDown();
    
    // Add payment method
    doc.fontSize(8).text(`Payment Method: ${sale.paymentMethod.toUpperCase()}`);
    
    // Add footer
    doc.moveDown();
    doc.fontSize(8).text('Thank you for your business!', { align: 'center' });
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

// Send receipt directly to thermal printer
const printToThermalPrinter = async (req, res) => {
  try {
    const { saleId } = req.params;
    
    const sale = await Sale.findById(saleId)
      .populate('customer')
      .populate('user', 'name')
      .populate('items.product');
      
    if (!sale) {
      return res.status(404).json({ message: 'Sale not found' });
    }

    // Log the thermal printer request
    console.log('Thermal printer request received for sale:', saleId);

    // Check printer configuration from environment or database
    const printerConfig = {
      type: process.env.PRINTER_TYPE || 'network', // 'usb', 'network', 'serial'
      address: process.env.PRINTER_ADDRESS || '192.168.1.100',
      port: process.env.PRINTER_PORT || 9100,
    };
    
    // For demonstration, we'll log the details and return success
    // In production, you would need to install the escpos package:
    // npm install escpos escpos-usb escpos-network --save
    console.log('Printing receipt to thermal printer:', {
      saleId,
      printerConfig,
      items: sale.items.length,
      total: sale.total
    });
    
    // If you need actual thermal printer integration, install the required packages and uncomment:
    /*
    // Import the required modules at the top of the file
    const escpos = require('escpos');
    // Choose the appropriate adapter
    if (printerConfig.type === 'usb') {
      require('escpos-usb');
    } else if (printerConfig.type === 'network') {
      require('escpos-network');
    }
    
    // Setup printer device
    let device;
    if (printerConfig.type === 'usb') {
      // USB connection
      device = new escpos.USB(printerConfig.vendorId, printerConfig.productId);
    } else if (printerConfig.type === 'network') {
      // Network/Ethernet connection
      device = new escpos.Network(printerConfig.address, printerConfig.port);
    } else if (printerConfig.type === 'serial') {
      // Serial connection
      device = new escpos.Serial(printerConfig.address, { baudRate: 9600 });
    }
    
    // Create printer and use a connected device
    const printer = new escpos.Printer(device);
    
    // Connect to the printer
    device.open(function() {
      // Chain commands to print receipt
      printer
        .font('a')
        .align('ct')
        .style('b')
        .size(1, 1)
        .text('SALES RECEIPT')
        .text('Bike Shop')
        .size(0, 0)
        .style('normal')
        .text('123 Bike Street, City')
        .text('Tel: 123-456-7890')
        .text('--------------------------------')
        .align('lt')
        .text(`Receipt #: ${sale.invoiceNumber || saleId}`)
        .text(`Date: ${new Date(sale.createdAt).toLocaleString()}`)
        .text(`Customer: ${sale.customer ? sale.customer.name : 'Walk-in Customer'}`)
        .text(`Cashier: ${sale.user ? sale.user.name : 'Unknown'}`)
        .text('--------------------------------')
        .tableCustom([
          { text:"Item", width:0.4 },
          { text:"Qty", width:0.1, align:"right" },
          { text:"Price", width:0.2, align:"right" },
          { text:"Total", width:0.3, align:"right" }
        ]);
      
      // Add items
      sale.items.forEach(item => {
        const name = item.product ? item.product.name : 'Unknown';
        const qty = item.quantity;
        const price = `Rs.${item.price.toFixed(2)}`;
        const total = `Rs.${(item.price * qty).toFixed(2)}`;
        
        printer.tableCustom([
          { text: name.substring(0, 16), width:0.4 },
          { text: qty.toString(), width:0.1, align:"right" },
          { text: price, width:0.2, align:"right" },
          { text: total, width:0.3, align:"right" }
        ]);
      });
      
      // Add totals
      printer
        .text('--------------------------------')
        .align('rt')
        .text(`Subtotal: Rs.${sale.subtotal.toFixed(2)}`);
      
      if (sale.discount > 0) {
        printer.text(`Discount: Rs.${sale.discount.toFixed(2)}`);
      }
      
      if (sale.tax > 0) {
        printer.text(`Tax: Rs.${sale.tax.toFixed(2)}`);
      }
      
      printer
        .text('--------------------------------')
        .style('b')
        .text(`TOTAL: Rs.${sale.total.toFixed(2)}`)
        .style('normal')
        .text(`Payment: ${sale.paymentMethod.toUpperCase()}`)
        .text('--------------------------------')
        .align('ct')
        .text('Thank you for your business!')
        .text('Return policy: 7 days with receipt')
        .cut()
        .close();
    });
    */
    
    // Respond with success
    res.status(200).json({
      success: true,
      message: 'Receipt sent to thermal printer simulation (install escpos package for real printing)'
    });
    
  } catch (error) {
    console.error('Error handling thermal printer request:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error when handling receipt printing',
      error: error.message
    });
  }
};

module.exports = {
  generateProductLabels,
  generateReceipt,
  printToThermalPrinter
};