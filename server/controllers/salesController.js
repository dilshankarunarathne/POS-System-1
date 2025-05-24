const { Sale, SaleItem, Product, User, sequelize } = require('../models');
const { Op } = require('sequelize');

// Generate invoice number
const generateInvoiceNumber = async () => {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
  
  // Get the last invoice number for today
  const lastSale = await Sale.findOne({
    where: {
      invoiceNumber: {
        [Op.like]: `INV-${dateStr}-%`
      }
    },
    order: [['createdAt', 'DESC']]
  });
  
  let nextNumber = 1;
  if (lastSale) {
    const parts = lastSale.invoiceNumber.split('-');
    nextNumber = parseInt(parts[2]) + 1;
  }
  
  return `INV-${dateStr}-${nextNumber.toString().padStart(4, '0')}`;
};

// Create a new sale
exports.createSale = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const {
      items,
      subtotal,
      discount = 0,
      tax = 0,
      total,
      paymentMethod,
      customerName,
      customerPhone,
      notes
    } = req.body;
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      await transaction.rollback();
      return res.status(400).json({ message: 'Sale items are required' });
    }
    
    // Generate invoice number
    const invoiceNumber = await generateInvoiceNumber();
    
    // Create sale
    const sale = await Sale.create({
      invoiceNumber,
      subtotal,
      discount,
      tax,
      total,
      paymentMethod,
      customerName,
      customerPhone,
      notes,
      userId: req.user.id
    }, { transaction });
    
    // Create sale items and update product stock
    for (const item of items) {
      // Check if product exists and has enough stock
      const product = await Product.findByPk(item.productId, { transaction });
      
      if (!product) {
        await transaction.rollback();
        return res.status(404).json({ message: `Product with ID ${item.productId} not found` });
      }
      
      if (product.stockQuantity < item.quantity) {
        await transaction.rollback();
        return res.status(400).json({ 
          message: `Insufficient stock for product: ${product.name}`,
          product: product.name,
          available: product.stockQuantity,
          requested: item.quantity
        });
      }
      
      // Create sale item
      await SaleItem.create({
        saleId: sale.id,
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount || 0,
        subtotal: item.subtotal
      }, { transaction });
      
      // Update product stock
      await product.update({
        stockQuantity: product.stockQuantity - item.quantity
      }, { transaction });
    }
    
    // Commit transaction
    await transaction.commit();
    
    // Return created sale with items
    const createdSale = await Sale.findByPk(sale.id, {
      include: [
        { model: SaleItem, include: [Product] },
        { model: User, as: 'cashier', attributes: ['id', 'username'] }
      ]
    });
    
    res.status(201).json(createdSale);
  } catch (error) {
    await transaction.rollback();
    console.error('Error creating sale:', error);
    res.status(500).json({ message: 'Server error while creating sale' });
  }
};

// Get all sales with pagination and filtering
exports.getAllSales = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      startDate,
      endDate,
      paymentMethod,
      status,
      minAmount,
      maxAmount,
      sort = 'createdAt',
      order = 'DESC'
    } = req.query;
    
    // Prepare filter conditions
    const whereConditions = {};
    
    // Date range filter
    if (startDate && endDate) {
      whereConditions.date = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    } else if (startDate) {
      whereConditions.date = {
        [Op.gte]: new Date(startDate)
      };
    } else if (endDate) {
      whereConditions.date = {
        [Op.lte]: new Date(endDate)
      };
    }
    
    // Payment method filter
    if (paymentMethod) {
      whereConditions.paymentMethod = paymentMethod;
    }
    
    // Status filter
    if (status) {
      whereConditions.status = status;
    }
    
    // Amount range filter
    if (minAmount || maxAmount) {
      whereConditions.total = {};
      if (minAmount) {
        whereConditions.total[Op.gte] = minAmount;
      }
      if (maxAmount) {
        whereConditions.total[Op.lte] = maxAmount;
      }
    }
    
    // Query sales with pagination
    const { count, rows: sales } = await Sale.findAndCountAll({
      where: whereConditions,
      include: [
        { model: User, as: 'cashier', attributes: ['id', 'username'] }
      ],
      order: [[sort, order]],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    });
    
    res.json({
      sales,
      totalPages: Math.ceil(count / parseInt(limit)),
      currentPage: parseInt(page),
      totalSales: count
    });
  } catch (error) {
    console.error('Error fetching sales:', error);
    res.status(500).json({ message: 'Server error while fetching sales' });
  }
};

// Get a single sale by ID with all details
exports.getSaleById = async (req, res) => {
  try {
    const sale = await Sale.findByPk(req.params.id, {
      include: [
        { 
          model: SaleItem, 
          include: [{ model: Product, attributes: ['id', 'name', 'barcode', 'price'] }] 
        },
        { model: User, as: 'cashier', attributes: ['id', 'username'] }
      ]
    });
    
    if (!sale) {
      return res.status(404).json({ message: 'Sale not found' });
    }
    
    res.json(sale);
  } catch (error) {
    console.error('Error fetching sale:', error);
    res.status(500).json({ message: 'Server error while fetching sale' });
  }
};

// Update sale status (for returns or cancellations)
exports.updateSaleStatus = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { id } = req.params;
    const { status, reason } = req.body;
    
    if (!['completed', 'returned', 'cancelled'].includes(status)) {
      await transaction.rollback();
      return res.status(400).json({ message: 'Invalid status' });
    }
    
    const sale = await Sale.findByPk(id, {
      include: [{ model: SaleItem }],
      transaction
    });
    
    if (!sale) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Sale not found' });
    }
    
    const oldStatus = sale.status;
    
    // Update sale status
    await sale.update({
      status,
      notes: reason ? `${sale.notes || ''} Status changed from ${oldStatus} to ${status}. Reason: ${reason}` : sale.notes
    }, { transaction });
    
    // If status changes to returned or from returned, update product stock
    if ((oldStatus !== 'returned' && status === 'returned') || 
        (oldStatus === 'returned' && status !== 'returned')) {
      
      for (const item of sale.SaleItems) {
        const product = await Product.findByPk(item.productId, { transaction });
        
        if (product) {
          // If changing to returned, add stock back
          // If changing from returned, remove stock again
          const stockChange = status === 'returned' ? item.quantity : -item.quantity;
          
          await product.update({
            stockQuantity: product.stockQuantity + stockChange
          }, { transaction });
        }
      }
    }
    
    await transaction.commit();
    
    // Return updated sale
    const updatedSale = await Sale.findByPk(id, {
      include: [
        { model: SaleItem, include: [Product] },
        { model: User, as: 'cashier', attributes: ['id', 'username'] }
      ]
    });
    
    res.json(updatedSale);
  } catch (error) {
    await transaction.rollback();
    console.error('Error updating sale status:', error);
    res.status(500).json({ message: 'Server error while updating sale status' });
  }
}; 