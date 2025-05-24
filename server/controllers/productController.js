const { Product, Category, Supplier } = require('../models');
const { Op } = require('sequelize');
const path = require('path');
const fs = require('fs');

// Get all products with pagination, filtering and sorting
exports.getAllProducts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      category,
      supplier,
      sort = 'name',
      order = 'ASC',
      lowStock,
    } = req.query;

    // Prepare filter conditions
    const whereConditions = {};
    
    if (search) {
      whereConditions[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { barcode: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } },
      ];
    }

    // Add category filter if provided
    if (category) {
      whereConditions.categoryId = category;
    }

    // Add supplier filter if provided
    if (supplier) {
      whereConditions.supplierId = supplier;
    }

    // Add low stock filter if requested
    if (lowStock === 'true') {
      whereConditions.stockQuantity = {
        [Op.lte]: Product.sequelize.col('reorderLevel'),
      };
    }

    // Query products with pagination
    const { count, rows: products } = await Product.findAndCountAll({
      where: whereConditions,
      include: [
        { model: Category },
        { model: Supplier },
      ],
      order: [[sort, order]],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
    });

    res.json({
      products,
      totalPages: Math.ceil(count / parseInt(limit)),
      currentPage: parseInt(page),
      totalProducts: count,
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ message: 'Server error while fetching products' });
  }
};

// Get a single product by ID
exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id, {
      include: [
        { model: Category },
        { model: Supplier },
      ],
    });

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json(product);
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ message: 'Server error while fetching product' });
  }
};

// Create a new product
exports.createProduct = async (req, res) => {
  try {
    const {
      name,
      barcode,
      description,
      price,
      costPrice,
      stockQuantity,
      reorderLevel,
      categoryId,
      supplierId,
      location,
      brand,
      bikeCompatibility,
    } = req.body;

    // Handle image upload
    let image = null;
    if (req.file) {
      image = `/uploads/products/${req.file.filename}`;
    }

    // Create product
    const product = await Product.create({
      name,
      barcode,
      description,
      price,
      costPrice,
      stockQuantity,
      reorderLevel,
      categoryId,
      supplierId,
      image,
      location,
      brand,
      bikeCompatibility,
    });

    res.status(201).json(product);
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ message: 'Server error while creating product' });
  }
};

// Update a product
exports.updateProduct = async (req, res) => {
  try {
    const productId = req.params.id;
    const product = await Product.findByPk(productId);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Handle image update
    let image = product.image;
    if (req.file) {
      // Remove old image if exists
      if (product.image) {
        const oldImagePath = path.join(__dirname, '..', product.image);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
      image = `/uploads/products/${req.file.filename}`;
    }

    // Update product
    await product.update({
      name: req.body.name,
      barcode: req.body.barcode,
      description: req.body.description,
      price: req.body.price,
      costPrice: req.body.costPrice,
      stockQuantity: req.body.stockQuantity,
      reorderLevel: req.body.reorderLevel,
      categoryId: req.body.categoryId,
      supplierId: req.body.supplierId,
      image,
      location: req.body.location,
      brand: req.body.brand,
      bikeCompatibility: req.body.bikeCompatibility,
      active: req.body.active,
    });

    res.json(product);
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ message: 'Server error while updating product' });
  }
};

// Delete a product
exports.deleteProduct = async (req, res) => {
  try {
    const productId = req.params.id;
    const product = await Product.findByPk(productId);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Delete the product's image if exists
    if (product.image) {
      const imagePath = path.join(__dirname, '..', product.image);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    await product.destroy();

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ message: 'Server error while deleting product' });
  }
};

// Get product by barcode
exports.getProductByBarcode = async (req, res) => {
  try {
    const { barcode } = req.params;
    
    const product = await Product.findOne({
      where: { barcode },
      include: [
        { model: Category },
        { model: Supplier },
      ],
    });

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json(product);
  } catch (error) {
    console.error('Error fetching product by barcode:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update stock quantity
exports.updateStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity, operation } = req.body;
    
    const product = await Product.findByPk(id);
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    let newQuantity;
    
    if (operation === 'add') {
      newQuantity = product.stockQuantity + parseInt(quantity);
    } else if (operation === 'subtract') {
      newQuantity = product.stockQuantity - parseInt(quantity);
      if (newQuantity < 0) {
        return res.status(400).json({ message: 'Insufficient stock' });
      }
    } else if (operation === 'set') {
      newQuantity = parseInt(quantity);
    } else {
      return res.status(400).json({ message: 'Invalid operation' });
    }
    
    await product.update({ stockQuantity: newQuantity });
    
    res.json({ 
      message: 'Stock updated successfully', 
      product: { ...product.toJSON(), stockQuantity: newQuantity } 
    });
  } catch (error) {
    console.error('Error updating stock:', error);
    res.status(500).json({ message: 'Server error' });
  }
}; 