const User = require('./User');
const Product = require('./Product');
const Category = require('./Category');
const Supplier = require('./Supplier');
const Sale = require('./Sale');
const SaleItem = require('./SaleItem');

// Define relationships

// Product and Category relationship
Product.belongsTo(Category, { foreignKey: 'categoryId', onDelete: 'SET NULL' });
Category.hasMany(Product, { foreignKey: 'categoryId' });

// Product and Supplier relationship
Product.belongsTo(Supplier, { foreignKey: 'supplierId', onDelete: 'SET NULL' });
Supplier.hasMany(Product, { foreignKey: 'supplierId' });

// Sale and User relationship
Sale.belongsTo(User, { foreignKey: 'userId', as: 'cashier' });
User.hasMany(Sale, { foreignKey: 'userId' });

// Sale and SaleItem relationship
Sale.hasMany(SaleItem, { foreignKey: 'saleId', onDelete: 'CASCADE' });
SaleItem.belongsTo(Sale, { foreignKey: 'saleId' });

// SaleItem and Product relationship
SaleItem.belongsTo(Product, { foreignKey: 'productId' });
Product.hasMany(SaleItem, { foreignKey: 'productId' });

module.exports = {
  User,
  Product,
  Category,
  Supplier,
  Sale,
  SaleItem
}; 