const Order = require('../models/Order');
const Product = require('../models/Product');

// Get all orders
const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate('supplier', 'name')
      .populate('items.product', 'name sku')
      .populate('user', 'name')
      .sort({ createdAt: -1 });
      
    res.status(200).json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ message: 'Server error fetching orders' });
  }
};

// Get order by ID
const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('supplier', 'name email phone address')
      .populate('items.product', 'name sku price')
      .populate('user', 'name');
      
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    res.status(200).json(order);
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ message: 'Server error fetching order' });
  }
};

// Create order
const createOrder = async (req, res) => {
  try {
    const { supplier, items, status, notes, expectedDeliveryDate } = req.body;
    
    if (!supplier || !items || items.length === 0) {
      return res.status(400).json({ message: 'Supplier and at least one item are required' });
    }
    
    // Calculate totals
    let subtotal = 0;
    for (const item of items) {
      subtotal += (item.price * item.quantity);
    }
    
    const order = await Order.create({
      orderNumber: generateOrderNumber(),
      supplier,
      items,
      subtotal,
      tax: req.body.tax || 0,
      total: subtotal + (req.body.tax || 0),
      status: status || 'pending',
      notes,
      expectedDeliveryDate,
      user: req.user._id
    });
    
    // Return created order
    const savedOrder = await Order.findById(order._id)
      .populate('supplier', 'name')
      .populate('items.product', 'name sku')
      .populate('user', 'name');
    
    res.status(201).json(savedOrder);
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ message: 'Server error creating order' });
  }
};

// Update order
const updateOrder = async (req, res) => {
  try {
    const { supplier, items, status, notes, expectedDeliveryDate } = req.body;
    
    if (!supplier || !items || items.length === 0) {
      return res.status(400).json({ message: 'Supplier and at least one item are required' });
    }
    
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    // Can only update pending orders
    if (order.status !== 'pending' && order.status !== 'draft') {
      return res.status(400).json({ message: 'Can only update pending or draft orders' });
    }
    
    // Calculate totals
    let subtotal = 0;
    for (const item of items) {
      subtotal += (item.price * item.quantity);
    }
    
    const updatedOrder = await Order.findByIdAndUpdate(
      req.params.id,
      {
        supplier,
        items,
        subtotal,
        tax: req.body.tax || 0,
        total: subtotal + (req.body.tax || 0),
        status: status || order.status,
        notes,
        expectedDeliveryDate,
        updatedAt: new Date()
      },
      { new: true, runValidators: true }
    )
      .populate('supplier', 'name')
      .populate('items.product', 'name sku')
      .populate('user', 'name');
    
    res.status(200).json(updatedOrder);
  } catch (error) {
    console.error('Error updating order:', error);
    res.status(500).json({ message: 'Server error updating order' });
  }
};

// Update order status
const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!status) {
      return res.status(400).json({ message: 'Status is required' });
    }
    
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    // Handle received orders - update inventory
    if (status === 'received' && order.status !== 'received') {
      // Update product quantities
      for (const item of order.items) {
        await Product.findByIdAndUpdate(
          item.product,
          { $inc: { quantity: item.quantity } }
        );
      }
    }
    
    order.status = status;
    order.updatedAt = new Date();
    
    if (status === 'received') {
      order.deliveryDate = new Date();
    }
    
    await order.save();
    
    const updatedOrder = await Order.findById(req.params.id)
      .populate('supplier', 'name')
      .populate('items.product', 'name sku')
      .populate('user', 'name');
    
    res.status(200).json(updatedOrder);
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ message: 'Server error updating order status' });
  }
};

// Delete order
const deleteOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    // Can only delete pending orders
    if (order.status !== 'pending' && order.status !== 'draft') {
      return res.status(400).json({ message: 'Can only delete pending or draft orders' });
    }
    
    await Order.findByIdAndDelete(req.params.id);
    
    res.status(200).json({ message: 'Order deleted successfully' });
  } catch (error) {
    console.error('Error deleting order:', error);
    res.status(500).json({ message: 'Server error deleting order' });
  }
};

// Helper function to generate order number
function generateOrderNumber() {
  const date = new Date();
  const year = date.getFullYear().toString().slice(2);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const randomDigits = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  
  return `PO-${year}${month}${day}-${randomDigits}`;
}

module.exports = {
  getAllOrders,
  getOrderById,
  createOrder,
  updateOrder,
  updateOrderStatus,
  deleteOrder
};
