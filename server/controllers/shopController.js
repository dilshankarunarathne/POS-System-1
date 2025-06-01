const Shop = require('../models/Shop');
const User = require('../models/User');

// Get all shops
exports.getAllShops = async (req, res) => {
  try {
    let shops;
    
    if (req.user.role === 'developer') {
      // Developers can see all shops
      shops = await Shop.find().sort({ createdAt: -1 });
    } else {
      // Other users can only see their assigned shop
      if (!req.user.shopId) {
        return res.json([]);
      }
      shops = [await Shop.findById(req.user.shopId._id)];
    }

    res.json(shops);
  } catch (error) {
    console.error('Error fetching shops:', error);
    res.status(500).json({ message: 'Server error fetching shops' });
  }
};

// Get shop by ID
exports.getShopById = async (req, res) => {
  try {
    const shop = await Shop.findById(req.params.id);
    
    if (!shop) {
      return res.status(404).json({ message: 'Shop not found' });
    }

    // Check if user has access to this shop
    if (req.user.role !== 'developer' && (!req.user.shopId || req.user.shopId._id.toString() !== shop._id.toString())) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(shop);
  } catch (error) {
    console.error('Error fetching shop:', error);
    res.status(500).json({ message: 'Server error fetching shop' });
  }
};

// Create shop
exports.createShop = async (req, res) => {
  try {
    // Only developers can create shops
    if (req.user.role !== 'developer') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { name, address, phone, email, owner } = req.body;

    // Check if shop with same name exists
    const existingShop = await Shop.findOne({ name });
    if (existingShop) {
      return res.status(400).json({ message: 'Shop with this name already exists' });
    }

    // Verify owner exists and is a valid user
    if (owner) {
      const ownerUser = await User.findById(owner);
      if (!ownerUser) {
        return res.status(400).json({ message: 'Specified owner not found' });
      }
    }

    const shop = new Shop({
      name,
      address,
      phone,
      email,
      owner: owner || req.user._id, // Use provided owner or default to current developer
      createdBy: req.user._id
    });

    await shop.save();
    res.status(201).json(shop);
  } catch (error) {
    console.error('Error creating shop:', error);
    res.status(500).json({ message: 'Server error creating shop' });
  }
};

// Update shop
exports.updateShop = async (req, res) => {
  try {
    // Only developers can update shops
    if (req.user.role !== 'developer') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { name, address, phone, email } = req.body;
    const shopId = req.params.id;

    // Check if shop exists
    const shop = await Shop.findById(shopId);
    if (!shop) {
      return res.status(404).json({ message: 'Shop not found' });
    }

    // Check if new name is already taken by another shop
    if (name && name !== shop.name) {
      const existingShop = await Shop.findOne({ 
        _id: { $ne: shopId },
        name 
      });
      
      if (existingShop) {
        return res.status(400).json({ message: 'Shop with this name already exists' });
      }
    }

    // Update shop with all provided fields
    shop.name = name || shop.name;
    shop.address = address !== undefined ? address : shop.address;
    shop.phone = phone !== undefined ? phone : shop.phone;
    shop.email = email !== undefined ? email : shop.email;
    shop.updatedAt = Date.now();
    
    await shop.save();

    res.json(shop);
  } catch (error) {
    console.error('Error updating shop:', error);
    res.status(500).json({ message: 'Server error updating shop' });
  }
};

// Delete shop
exports.deleteShop = async (req, res) => {
  try {
    // Only developers can delete shops
    if (req.user.role !== 'developer') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const shop = await Shop.findById(req.params.id);
    
    if (!shop) {
      return res.status(404).json({ message: 'Shop not found' });
    }

    // Check if shop has any users
    const usersCount = await User.countDocuments({ shopId: shop._id });
    if (usersCount > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete shop with active users. Please reassign or delete users first.' 
      });
    }

    await Shop.deleteOne({ _id: shop._id });
    res.json({ message: 'Shop deleted successfully' });
  } catch (error) {
    console.error('Error deleting shop:', error);
    res.status(500).json({ message: 'Server error deleting shop' });
  }
};

// Toggle shop status
exports.toggleShopStatus = async (req, res) => {
  try {
    // Only developers can toggle shop status
    if (req.user.role !== 'developer') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const shop = await Shop.findById(req.params.id);
    
    if (!shop) {
      return res.status(404).json({ message: 'Shop not found' });
    }

    shop.active = !shop.active;
    shop.updatedAt = Date.now();
    await shop.save();

    res.json(shop);
  } catch (error) {
    console.error('Error toggling shop status:', error);
    res.status(500).json({ message: 'Server error updating shop status' });
  }
};
