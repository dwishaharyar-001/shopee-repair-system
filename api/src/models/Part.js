const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Part = sequelize.define('Part', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  part_number: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  category: {
    type: DataTypes.STRING(50),
    defaultValue: 'General Spare Part'
  },
  stock_quantity: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  unit_cost: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00
  },
  min_stock_trigger: {
    type: DataTypes.INTEGER,
    defaultValue: 5
  },
  branch_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'branches',
      key: 'id'
    }
  }
}, {
  tableName: 'parts',
  timestamps: true,
  underscored: true
});

module.exports = Part;
