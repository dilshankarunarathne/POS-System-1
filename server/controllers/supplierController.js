const mongoose = require('mongoose');
const Supplier = require('../models/Supplier');

// Get all suppliers
const getAllSuppliers = async (req, res) => {
  try {
    const filter = {};
    
    // Add shop filter for non-developers
    if (req.user.role !== 'developer') {
      filter.shopId = req.user.shopId;
    }
    
    const suppliers = await Supplier.find(filter);
    res.status(200).json(suppliers);
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    res.status(500).json({ message: 'Server error fetching suppliers' });
  }
};

// Get supplier by ID
const getSupplierById = async (req, res) => {
  try {
    const filter = { _id: req.params.id };
    
    // Add shop filter for non-developers
    if (req.user.role !== 'developer') {
      filter.shopId = req.user.shopId;
    }
    
    const supplier = await Supplier.findOne(filter);
    if (!supplier) {
      return res.status(404).json({ message: 'Supplier not found' });
    }
    res.status(200).json(supplier);
  } catch (error) {
    console.error('Error fetching supplier:', error);
    res.status(500).json({ message: 'Server error fetching supplier' });
  }
};

// Create supplier
const createSupplier = async (req, res) => {
  try {
    const supplierData = {
      ...req.body,
      shopId: req.user.shopId // Add shop ID to new suppliers
    };
    
    const supplier = await Supplier.create(supplierData);
    res.status(201).json(supplier);
  } catch (error) {
    console.error('Error creating supplier:', error);
    res.status(500).json({ message: 'Server error creating supplier' });
  }
};

// Update supplier
const updateSupplier = async (req, res) => {
  try {
    // Validate ID format
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid supplier ID format' });
    }

    const filter = { _id: req.params.id };
    
    // Add shop filter for non-developers
    if (req.user.role !== 'developer') {
      filter.shopId = req.user.shopId;
    }

    const supplier = await Supplier.findOneAndUpdate(
      filter,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!supplier) {
      return res.status(404).json({ message: 'Supplier not found' });
    }
    
    res.status(200).json(supplier);
  } catch (error) {
    console.error('Error updating supplier:', error);
    // More specific error messages based on error type
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: 'Validation error', details: error.message });
    }
    res.status(500).json({ message: 'Server error updating supplier' });
  }
};

// Delete supplier
const deleteSupplier = async (req, res) => {
  try {
    // Validate ID format
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid supplier ID format' });
    }

    const filter = { _id: req.params.id };
    
    // Add shop filter for non-developers
    if (req.user.role !== 'developer') {
      filter.shopId = req.user.shopId;
    }

    const supplier = await Supplier.findOne(filter);
    
    if (!supplier) {
      return res.status(404).json({ message: 'Supplier not found' });
    }
    
    // Delete the supplier
    await Supplier.findOneAndDelete(filter);
    
    res.status(200).json({ message: 'Supplier deleted successfully', id: req.params.id });
  } catch (error) {
    console.error('Error deleting supplier:', error);
    res.status(500).json({ message: 'Server error deleting supplier', details: error.message });
  }
};

module.exports = {
  getAllSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier
};
