const Category = require('../models/Category');
const Product = require('../models/Product');

// Get all categories
const getAllCategories = async (req, res) => {
  try {
    const categories = await Category.find({ shopId: req.user.shopId });
    res.status(200).json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ message: 'Server error fetching categories' });
  }
};

// Get category by ID
const getCategoryById = async (req, res) => {
  try {
    const category = await Category.findOne({
      _id: req.params.id,
      shopId: req.user.shopId
    });
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }
    res.status(200).json(category);
  } catch (error) {
    console.error('Error fetching category:', error);
    res.status(500).json({ message: 'Server error fetching category' });
  }
};

// Create category
const createCategory = async (req, res) => {
  try {
    const { name, description } = req.body;
    
    if (!name) {
      return res.status(400).json({ message: 'Category name is required' });
    }
    
    // Check if category with same name exists in this shop
    const existingCategory = await Category.findOne({
      name: name,
      shopId: req.user.shopId
    });
    
    if (existingCategory) {
      return res.status(400).json({ message: 'A category with this name already exists in your shop' });
    }
    
    const category = await Category.create({
      name,
      description,
      shopId: req.user.shopId
    });
    res.status(201).json(category);
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ message: 'Server error creating category' });
  }
};

// Update category
const updateCategory = async (req, res) => {
  try {
    const { name, description } = req.body;
    
    if (!name) {
      return res.status(400).json({ message: 'Category name is required' });
    }
    
    // Check if another category with same name exists in this shop
    const existingCategory = await Category.findOne({
      name: name,
      shopId: req.user.shopId,
      _id: { $ne: req.params.id }
    });
    
    if (existingCategory) {
      return res.status(400).json({ message: 'A category with this name already exists in your shop' });
    }
    
    const category = await Category.findOneAndUpdate(
      {
        _id: req.params.id,
        shopId: req.user.shopId
      },
      { name, description },
      { new: true, runValidators: true }
    );
    
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }
    
    res.status(200).json(category);
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({ message: 'Server error updating category' });
  }
};

// Delete category
const deleteCategory = async (req, res) => {
  try {
    const category = await Category.findOneAndDelete({
      _id: req.params.id,
      shopId: req.user.shopId
    });
    
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }
    
    // Update products that use this category in this shop
    await Product.updateMany(
      { 
        category: req.params.id,
        shopId: req.user.shopId
      },
      { $set: { category: null } }
    );
    
    res.status(200).json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ message: 'Server error deleting category' });
  }
};

module.exports = {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory
};
