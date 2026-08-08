const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const BranchCategoryPrice = sequelize.define('BranchCategoryPrice', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  branch_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'branches',
      key: 'id'
    }
  },
  category_name: {
    type: DataTypes.STRING(150),
    allowNull: false
  },
  price: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0
  }
}, {
  tableName: 'branch_category_prices',
  timestamps: true,
  underscored: true
});

module.exports = BranchCategoryPrice;
