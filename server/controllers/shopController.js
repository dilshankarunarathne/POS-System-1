const Shop = require('../models/Shop');
const User = require('../models/User');

// Get all shops (admin only)
exports.getAllShops = async (req, res) => {
  try {
    const shops = await Shop.find()
      .populate('owner', 'name username email')
      .populate('createdBy', 'name username');
      
    res.status(200).json(shops);
  } catch (error) {
    console.error('Error fetching shops:', error.message);
    res.status(500).json({ message: 'Server error fetching shops' });
  }
};

// Get shop by ID
exports.getShopById = async (req, res) => {
  try {
    const shop = await Shop.findById(req.params.id)
      .populate('owner', 'name username email')
      .populate('createdBy', 'name username');
      
    if (!shop) {
      return res.status(404).json({ message: 'Shop not found' });
    }
    
    // Check if user has access to this shop
    if (req.user.role !== 'admin' && (!req.user.shop || req.user.shop._id.toString() !== shop._id.toString())) {
      return res.status(403).json({ message: 'Not authorized to access this shop' });
    }
    
    res.status(200).json(shop);
  } catch (error) {
    console.error('Error fetching shop:', error.message);
    res.status(500).json({ message: 'Server error fetching shop' });
  }
};

// Create shop (admin only)
exports.createShop = async (req, res) => {
  try {
    // Only admin can create shops directly
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to create shops' });
    }
    
    const { name, address, phone, email, ownerId } = req.body;
    
    if (!name || !ownerId) {
      return res.status(400).json({ message: 'Shop name and owner ID are required' });
    }
    
    // Check if owner exists and is actually an owner
    const owner = await User.findById(ownerId);
    if (!owner) {
      return res.status(404).json({ message: 'Owner not found' });
    }
    
    if (owner.role !== 'owner') {
      return res.status(400).json({ message: 'User is not a shop owner' });
    }
    
    // Create shop
    const shop = await Shop.create({
      name,
      address,
      phone,
      email,
      owner: ownerId,
      createdBy: req.user._id
    });
    
    // Update owner with shop reference
    owner.shop = shop._id;
    await owner.save();
    
    res.status(201).json(shop);
  } catch (error) {
    console.error('Error creating shop:', error.message);
    res.status(500).json({ message: 'Server error creating shop' });
  }
};

// Update shop
exports.updateShop = async (req, res) => {
  try {
    const { name, address, phone, email } = req.body;
    const shopId = req.params.id;
    
    const shop = await Shop.findById(shopId);
    
    if (!shop) {
      return res.status(404).json({ message: 'Shop not found' });
    }
    
    // Check if user has permission to update (admin or shop owner)
    if (req.user.role !== 'admin' && 
        (!req.user.shop || req.user.shop._id.toString() !== shopId || req.user.role !== 'owner')) {
      return res.status(403).json({ message: 'Not authorized to update this shop' });
    }
    
    // Update shop fields
    shop.name = name || shop.name;
    shop.address = address || shop.address;
    shop.phone = phone || shop.phone;
    shop.email = email || shop.email;
    shop.updatedAt = Date.now();
    
    await shop.save();
    
    res.status(200).json(shop);
  } catch (error) {
    console.error('Error updating shop:', error.message);
    res.status(500).json({ message: 'Server error updating shop' });
  }
};

// Get shop users (admin or owner only)
exports.getShopUsers = async (req, res) => {
  try {
    const shopId = req.params.id;
    
    const shop = await Shop.findById(shopId);
    if (!shop) {
      return res.status(404).json({ message: 'Shop not found' });
    }
    
    // Check if user has permission (admin or shop owner)
    if (req.user.role !== 'admin' && 
        (!req.user.shop || req.user.shop._id.toString() !== shopId || req.user.role !== 'owner')) {
      return res.status(403).json({ message: 'Not authorized to view shop users' });
    }
    
    // Find all users for this shop
    const users = await User.find({ shop: shopId }).select('-password');
    
    res.status(200).json(users);
  } catch (error) {
    console.error('Error fetching shop users:', error.message);
    res.status(500).json({ message: 'Server error fetching shop users' });
  }
};
