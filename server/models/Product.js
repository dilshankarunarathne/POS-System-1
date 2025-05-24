const { DataTypes } = require('sequelize');
const { sequelize } = require('../index');

const Product = sequelize.define('Product', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  barcode: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  costPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  stockQuantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  reorderLevel: {
    type: DataTypes.INTEGER,
    defaultValue: 10,
  },
  image: {
    type: DataTypes.STRING,
  },
  location: {
    type: DataTypes.STRING,
  },
  brand: {
    type: DataTypes.STRING,
  },
  bikeCompatibility: {
    type: DataTypes.TEXT,
  },
  active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
});

module.exports = Product; 