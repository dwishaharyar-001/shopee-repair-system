const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Device = sequelize.define('Device', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  device_id: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true
  },
  serial_number: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true
  },
  brand: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  model: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  asset_type: {
    type: DataTypes.ENUM('Type A', 'Type B', 'Type C', 'Type D', 'Type E', 'Type F'),
    allowNull: false,
    defaultValue: 'Type A'
  },
  customer_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'customers',
      key: 'id'
    }
  }
}, {
  tableName: 'devices',
  timestamps: true,
  underscored: true
});

module.exports = Device;
