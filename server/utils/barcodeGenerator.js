/**
 * Utility for generating unique barcodes for products
 */
const mongoose = require('mongoose');

/**
 * Generate a unique barcode for a product
 * @param {Object} product - The product document
 * @returns {Promise<string>} A unique barcode
 */
const generateBarcode = async (product) => {
  try {
    // Generate a base code using timestamp and product info
    const timestamp = Date.now().toString().slice(-10);
    const shopId = product.shop ? product.shop.toString().slice(-4) : '0000';
    
    // Default format: SHOP + TIMESTAMP + RANDOM
    const randomPart = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    let baseCode = `${shopId}${timestamp}${randomPart}`;
    
    // Make sure it's exactly 13 digits (standard EAN-13 length)
    baseCode = baseCode.slice(0, 12);
    
    // Calculate checksum for EAN-13
    const checkDigit = calculateEAN13CheckDigit(baseCode);
    const barcode = `${baseCode}${checkDigit}`;
    
    // Check if barcode already exists in the database
    const Product = mongoose.model('Product');
    const existingProduct = await Product.findOne({ barcode });
    
    // If barcode already exists, recursively generate a new one
    if (existingProduct) {
      return generateBarcode(product);
    }
    
    // Create an internal QR-compatible record of the barcode
    product._qrData = {
      barcode: barcode,
      productId: product._id ? product._id.toString() : null,
      name: product.name,
      price: product.price
    };
    
    return barcode;
  } catch (error) {
    console.error('Error generating barcode:', error);
    // Fallback to a simpler barcode generation method if there's an error
    const fallbackBarcode = `${Date.now()}${Math.floor(Math.random() * 100000)}`;
    return fallbackBarcode;
  }
};

/**
 * Calculate the check digit for an EAN-13 barcode
 * @param {string} digits - The first 12 digits of the barcode
 * @returns {string} The check digit
 */
const calculateEAN13CheckDigit = (digits) => {
  // Ensure we have exactly 12 digits to work with
  const code = digits.padStart(12, '0').slice(0, 12);
  
  let sum = 0;
  
  // EAN-13 checksum calculation
  for (let i = 0; i < 12; i++) {
    sum += parseInt(code[i]) * (i % 2 === 0 ? 1 : 3);
  }
  
  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit.toString();
};

module.exports = generateBarcode;
