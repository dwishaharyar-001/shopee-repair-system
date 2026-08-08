const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const BrokenPart = sequelize.define('BrokenPart', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  service_order_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  device_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  category_name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  serial_number: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  damage_reason: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  reported_by_user_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  }
}, {
  tableName: 'broken_parts',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = BrokenPart;
