const Product = require('../models/Product');
const Category = require('../models/Category');
const Supplier = require('../models/Supplier');
const path = require('path');
const fs = require('fs');

// Get all products
const getAllProducts = async (req, res) => {
  try {
    // Add pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    // Add sorting and filtering options
    const sort = req.query.sort || '-updatedAt'; // Default sort by latest updated
    const filter = {};
    
    if (req.query.category) {
      filter.category = req.query.category;
    }
    
    if (req.query.supplier) {
      filter.supplier = req.query.supplier;
    }
    
    if (req.query.search) {
      filter.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { description: { $regex: req.query.search, $options: 'i' } },
        { barcode: { $regex: req.query.search, $options: 'i' } },
        { sku: { $regex: req.query.search, $options: 'i' } }
      ];
    }
    
    // Low stock filter - compare quantity to reorderLevel
    if (req.query.lowStock === 'true') {
      filter.$expr = { $lte: ["$quantity", "$reorderLevel"] };
    }
    
    const products = await Product.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate('category')
      .populate('supplier');
    
    // Transform for frontend field naming
    const transformedProducts = products.map(product => {
      const productObj = product.toObject();
      return {
        ...productObj,
        id: productObj._id, // Ensure ID is available in the expected format 
        stockQuantity: productObj.quantity,
        costPrice: productObj.cost,
        categoryId: productObj.category ? productObj.category._id : null,
        supplierId: productObj.supplier ? productObj.supplier._id : null
      };
    });
    
    const total = await Product.countDocuments(filter);
    
    res.status(200).json({
      products: transformedProducts,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ message: 'Server error while fetching products', error: error.message });
  }
};

// Get product by ID
const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('category')
      .populate('supplier');
      
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.status(200).json(product);
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ message: 'Server error fetching product' });
  }
};

// Get product by barcode
const getProductByBarcode = async (req, res) => {
  try {
    const product = await Product.findOne({ barcode: req.params.barcode })
      .populate('category')
      .populate('supplier');
      
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.status(200).json(product);
  } catch (error) {
    console.error('Error fetching product by barcode:', error);
    res.status(500).json({ message: 'Server error fetching product' });
  }
};

// Get product by barcode
const getByBarcode = async (req, res) => {
  try {
    const { barcode } = req.params;
    
    if (!barcode) {
      return res.status(400).json({ 
        success: false,
        message: 'Barcode parameter is required' 
      });
    }
    
    const product = await Product.findOne({ barcode })
      .populate('category');
    
    if (!product) {
      return res.status(404).json({ 
        success: false,
        message: 'Product not found with this barcode' 
      });
    }
    
    return res.status(200).json({
      success: true,
      data: product
    });
  } catch (error) {
    console.error('Error fetching product by barcode:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching product',
      error: error.message
    });
  }
};

// Create product
const createProduct = async (req, res) => {
  try {
    const productData = req.body;
    
    // If an image was uploaded, add the path
    if (req.file) {
      productData.image = `/uploads/products/${req.file.filename}`;
    }
    
    // Map frontend field names to backend field names if needed
    if (productData.stockQuantity !== undefined) {
      productData.quantity = parseInt(productData.stockQuantity);
      delete productData.stockQuantity;
    }
    
    if (productData.costPrice !== undefined) {
      productData.cost = parseFloat(productData.costPrice);
      delete productData.costPrice;
    }
    
    if (productData.price !== undefined) {
      productData.price = parseFloat(productData.price);
    }
    
    if (productData.reorderLevel !== undefined) {
      productData.reorderLevel = parseInt(productData.reorderLevel);
    }
    
    // Handle category - only use existing categories, don't create new ones
    if (productData.categoryId) {
      // Use category ID directly
      const category = await Category.findById(productData.categoryId);
      if (category) {
        productData.category = category._id;
      } else {
        productData.category = null;
      }
    } else if (productData.categoryName) {
      // Find category by name but don't create a new one
      const category = await Category.findOne({ name: productData.categoryName });
      if (category) {
        productData.category = category._id;
      } else {
        productData.category = null;
      }
    } else {
      productData.category = null;
    }
    
    delete productData.categoryId;
    delete productData.categoryName;
    
    // Handle supplier - only use existing suppliers, don't create new ones
    if (productData.supplierId) {
      // Use supplier ID directly
      const supplier = await Supplier.findById(productData.supplierId);
      if (supplier) {
        productData.supplier = supplier._id;
      } else {
        productData.supplier = null;
      }
    } else if (productData.supplierName) {
      // Find supplier by name but don't create a new one
      const supplier = await Supplier.findOne({ name: productData.supplierName });
      if (supplier) {
        productData.supplier = supplier._id;
      } else {
        productData.supplier = null;
      }
    } else {
      productData.supplier = null;
    }
    
    delete productData.supplierId;
    delete productData.supplierName;
    
    // Create product - barcode will be auto-generated if not provided
    const product = await Product.create(productData);
    
    // Populate references for the response
    const populatedProduct = await Product.findById(product._id)
      .populate('category')
      .populate('supplier');
    
    res.status(201).json(populatedProduct);
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ message: 'Server error creating product', error: error.message });
  }
};

// Update product
const updateProduct = async (req, res) => {
  try {
    const productData = req.body;
    
    // If an image was uploaded, add the path
    if (req.file) {
      productData.image = `/uploads/products/${req.file.filename}`;
    }
    
    // Map frontend field names to backend field names if needed
    if (productData.stockQuantity !== undefined) {
      productData.quantity = parseInt(productData.stockQuantity);
      delete productData.stockQuantity;
    }
    
    if (productData.costPrice !== undefined) {
      productData.cost = parseFloat(productData.costPrice);
      delete productData.costPrice;
    }
    
    if (productData.price !== undefined) {
      productData.price = parseFloat(productData.price);
    }
    
    if (productData.reorderLevel !== undefined) {
      productData.reorderLevel = parseInt(productData.reorderLevel);
    }
    
    // Handle category - support both ID and name-based assignment
    if (productData.categoryId) {
      // Use category ID directly
      const category = await Category.findById(productData.categoryId);
      if (category) {
        productData.category = category._id;
      }
    } else if (productData.categoryName) {
      // Find category by name or create a new one
      let category = await Category.findOne({ 
        name: { $regex: new RegExp(`^${productData.categoryName}$`, 'i') }
      });
      
      // If category doesn't exist and name is provided, create it
      if (!category && productData.categoryName.trim()) {
        category = await Category.create({ name: productData.categoryName.trim() });
      }
      
      if (category) {
        productData.category = category._id;
      } else {
        productData.category = null;
      }
    }
    
    delete productData.categoryId;
    delete productData.categoryName;
    
    // Handle supplier - support both ID and name-based assignment
    if (productData.supplierId) {
      // Use supplier ID directly
      const supplier = await Supplier.findById(productData.supplierId);
      if (supplier) {
        productData.supplier = supplier._id;
      }
    } else if (productData.supplierName) {
      // Find supplier by name or create a new one
      let supplier = await Supplier.findOne({ 
        name: { $regex: new RegExp(`^${productData.supplierName}$`, 'i') }
      });
      
      // If supplier doesn't exist and name is provided, create it
      if (!supplier && productData.supplierName.trim()) {
        supplier = await Supplier.create({ name: productData.supplierName.trim() });
      }
      
      if (supplier) {
        productData.supplier = supplier._id;
      } else {
        productData.supplier = null;
      }
    }
    
    delete productData.supplierId;
    delete productData.supplierName;
    
    // Set updated timestamp
    productData.updatedAt = new Date();
    
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      productData,
      { new: true, runValidators: true }
    ).populate('category').populate('supplier');
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    res.status(200).json(product);
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ message: 'Server error updating product', error: error.message });
  }
};

// Delete product
const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    // If the product has an image, you might want to delete it from storage
    // This would require a file system operation to remove the file
    
    res.status(200).json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ message: 'Server error deleting product' });
  }
};

// Update stock quantity
const updateStock = async (req, res) => {
  try {
    const { quantity } = req.body;
    
    if (quantity === undefined) {
      return res.status(400).json({ message: 'Quantity is required' });
    }
    
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { 
        $set: { quantity: quantity },
        updatedAt: new Date() 
      },
      { new: true, runValidators: true }
    );
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    res.status(200).json(product);
  } catch (error) {
    console.error('Error updating stock:', error);
    res.status(500).json({ message: 'Server error updating stock' });
  }
};

// Get the latest added products
const getLatestProducts = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10; // Default to 10 products
    const products = await Product.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('category')
      .populate('supplier');
    
    if (!products || products.length === 0) {
      return res.status(404).json({ message: 'No products found' });
    }
    
    res.status(200).json(products);
  } catch (error) {
    console.error('Error fetching latest products:', error);
    res.status(500).json({ message: 'Server error while fetching latest products', error: error.message });
  }
};

// Force refresh the products list
const refreshProducts = async (req, res) => {
  try {
    // Clear any potential cache (if you're using caching)
    // Then fetch all products fresh from the database
    const products = await Product.find()
      .sort({ updatedAt: -1 })
      .populate('category')
      .populate('supplier');
    
    res.status(200).json(products);
  } catch (error) {
    console.error('Error refreshing products:', error);
    res.status(500).json({ message: 'Server error while refreshing products', error: error.message });
  }
};

// Generate labels
const generateLabels = async (req, res) => {
  try {
    console.log('Redirecting label generation to print controller');
    // Forward this request to the print controller
    const printController = require('./printController');
    return printController.generateProductLabels(req, res);
  } catch (error) {
    console.error('Error generating labels:', error);
    res.status(500).json({
      success: false,
      message: 'Server error generating labels',
      error: error.message
    });
  }
};

module.exports = {
  getAllProducts,
  getProductById,
  getProductByBarcode,
  createProduct,
  updateProduct,
  deleteProduct,
  updateStock,
  getLatestProducts,
  refreshProducts,
  generateLabels,
  getByBarcode
};