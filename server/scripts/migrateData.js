const dotenv = require('dotenv');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { connectDB } = require('../config/database');

// Load environment variables from proper path
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// MongoDB models
const Product = require('../models/Product');
const Category = require('../models/Category');
const User = require('../models/User');
const Customer = require('../models/Customer');
const Sale = require('../models/Sale');
const Shop = require('../models/Shop');

// Sample data paths (you can provide JSON files with initial data)
const SAMPLE_DATA_DIR = path.join(__dirname, '../data');

// Removed the custom MongoDB connection function since we're now using the shared one

const loadSampleData = (filename) => {
  try {
    const filePath = path.join(SAMPLE_DATA_DIR, filename);
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(data);
    }
    console.warn(`Sample data file ${filename} not found`);
    return [];
  } catch (error) {
    console.error(`Error loading sample data from ${filename}:`, error);
    return [];
  }
};

const migrateCategories = async () => {
  console.log('Migrating categories...');
  try {
    const categories = loadSampleData('categories.json');
    
    // Map of old IDs to new MongoDB ObjectIds
    const categoryMap = {};
    
    // Insert categories into MongoDB
    for (const category of categories) {
      const newCategory = new Category({
        name: category.name,
        description: category.description,
        createdAt: category.created_at || new Date()
      });
      
      const savedCategory = await newCategory.save();
      categoryMap[category.id] = savedCategory._id;
    }
    
    // Save the mapping for later use
    fs.writeFileSync(path.join(__dirname, 'categoryMap.json'), JSON.stringify(categoryMap));
    console.log(`Migrated ${categories.length} categories`);
    return categoryMap;
  } catch (error) {
    console.error('Error migrating categories:', error);
    throw error;
  }
};

const migrateProducts = async (categoryMap) => {
  console.log('Migrating products...');
  try {
    const products = loadSampleData('products.json');
    
    const productMap = {};
    
    // Insert products into MongoDB
    for (const product of products) {
      const newProduct = new Product({
        name: product.name,
        description: product.description,
        sku: product.sku,
        price: product.price,
        cost: product.cost,
        quantity: product.quantity,
        barcode: product.barcode,
        category: categoryMap[product.category_id],
        createdAt: product.created_at || new Date(),
        updatedAt: product.updated_at || product.created_at || new Date()
      });
      
      const savedProduct = await newProduct.save();
      productMap[product.id] = savedProduct._id;
    }
    
    fs.writeFileSync(path.join(__dirname, 'productMap.json'), JSON.stringify(productMap));
    console.log(`Migrated ${products.length} products`);
    return productMap;
  } catch (error) {
    console.error('Error migrating products:', error);
    throw error;
  }
};

const migrateUsers = async () => {
  console.log('Migrating users...');
  try {
    const users = loadSampleData('users.json');
    
    const userMap = {};
    
    // Insert users into MongoDB
    for (const user of users) {
      const newUser = new User({
        name: user.name,
        username: user.username || `user_${Math.floor(Math.random() * 10000)}`,
        email: user.email,
        password: user.password, // Assuming passwords are already hashed
        role: user.role,
        active: user.active,
        createdAt: user.created_at || new Date()
      });
      
      // Disable password hashing for imported users
      const originalSave = newUser.save;
      newUser.save = function() {
        this.$__skipPasswordHashing = true;
        return originalSave.apply(this, arguments);
      };
      
      const savedUser = await newUser.save();
      userMap[user.id] = savedUser._id;
    }
    
    fs.writeFileSync(path.join(__dirname, 'userMap.json'), JSON.stringify(userMap));
    console.log(`Migrated ${users.length} users`);
    return userMap;
  } catch (error) {
    console.error('Error migrating users:', error);
    throw error;
  }
};

const migrateCustomers = async () => {
  console.log('Migrating customers...');
  try {
    const customers = loadSampleData('customers.json');
    
    const customerMap = {};
    
    // Insert customers into MongoDB
    for (const customer of customers) {
      const newCustomer = new Customer({
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        address: {
          street: customer.street_address,
          city: customer.city,
          state: customer.state,
          zipCode: customer.zip_code
        },
        createdAt: customer.created_at || new Date()
      });
      
      const savedCustomer = await newCustomer.save();
      customerMap[customer.id] = savedCustomer._id;
    }
    
    fs.writeFileSync(path.join(__dirname, 'customerMap.json'), JSON.stringify(customerMap));
    console.log(`Migrated ${customers.length} customers`);
    return customerMap;
  } catch (error) {
    console.error('Error migrating customers:', error);
    throw error;
  }
};

const migrateShops = async () => {
  console.log('Migrating shops...');
  try {
    const shops = loadSampleData('shops.json');
    
    const shopMap = {};
    
    // Insert shops into MongoDB
    for (const shop of shops) {
      const newShop = new Shop({
        name: shop.name,
        address: shop.address,
        phone: shop.phone,
        email: shop.email,
        owner: shop.owner_id, // Assuming this maps to a user ID
        logo: shop.logo,
        active: shop.active !== false,
        createdAt: shop.created_at || new Date()
      });
      
      const savedShop = await newShop.save();
      shopMap[shop.id] = savedShop._id;
    }
    
    fs.writeFileSync(path.join(__dirname, 'shopMap.json'), JSON.stringify(shopMap));
    console.log(`Migrated ${shops.length} shops`);
    return shopMap;
  } catch (error) {
    console.error('Error migrating shops:', error);
    throw error;
  }
};

const migrateSales = async (productMap, customerMap, userMap, shopMap = {}) => {
  console.log('Migrating sales...');
  try {
    const sales = loadSampleData('sales.json');
    const saleItems = loadSampleData('sale_items.json');
    
    // Group sale items by sale_id
    const salesItemsMap = {};
    for (const item of saleItems) {
      if (!salesItemsMap[item.sale_id]) {
        salesItemsMap[item.sale_id] = [];
      }
      salesItemsMap[item.sale_id].push(item);
    }
    
    // Create a map to track old sale IDs to new MongoDB ObjectIds
    const saleMap = {};
    
    // Insert sales into MongoDB
    for (const sale of sales) {
      const items = (salesItemsMap[sale.id] || []).map(item => ({
        product: productMap[item.product_id],
        quantity: item.quantity,
        price: item.price,
        discount: item.discount || 0
      }));
      
      const newSale = new Sale({
        invoiceNumber: sale.invoice_number || `INV-${Date.now()}-${Math.floor(Math.random() * 1000).toString().padStart(4, '0')}`,
        customer: customerMap[sale.customer_id],
        items,
        subtotal: sale.subtotal,
        tax: sale.tax || 0,
        discount: sale.discount || 0,
        total: sale.total,
        paymentMethod: sale.payment_method,
        user: userMap[sale.user_id],
        shop: shopMap[sale.shop_id],
        status: sale.status || 'completed',
        createdAt: sale.created_at || new Date(),
        notes: sale.notes
      });
      
      const savedSale = await newSale.save();
      saleMap[sale.id] = savedSale._id;
    }
    
    // Save the mapping for later use
    fs.writeFileSync(path.join(__dirname, 'saleMap.json'), JSON.stringify(saleMap));
    console.log(`Migrated ${sales.length} sales`);
    return saleMap;
  } catch (error) {
    console.error('Error migrating sales:', error);
    throw error;
  }
};

const migrateAllData = async () => {
  try {
    if (!fs.existsSync(SAMPLE_DATA_DIR)) {
      fs.mkdirSync(SAMPLE_DATA_DIR, { recursive: true });
      console.log(`Created sample data directory: ${SAMPLE_DATA_DIR}`);
      console.log('Please place your JSON data files in this directory and run again.');
      process.exit(0);
    }

    // Use the shared connectDB function instead of the custom one
    await connectDB();
    
    // Clear existing MongoDB data
    await Promise.all([
      Category.deleteMany({}),
      Product.deleteMany({}),
      User.deleteMany({}),
      Customer.deleteMany({}),
      Sale.deleteMany({}),
      Shop.deleteMany({})
    ]);
    
    // Migrate data
    const categoryMap = await migrateCategories();
    const productMap = await migrateProducts(categoryMap);
    const userMap = await migrateUsers();
    const customerMap = await migrateCustomers();
    const shopMap = await migrateShops();
    await migrateSales(productMap, customerMap, userMap, shopMap);
    
    console.log('Data migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await mongoose.disconnect();
  }
};

migrateAllData();
