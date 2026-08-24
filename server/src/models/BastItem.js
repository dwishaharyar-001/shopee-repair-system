const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const BastItem = sequelize.define('BastItem', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  bast_document_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'bast_documents',
      key: 'id'
    }
  },
  service_order_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'service_orders',
      key: 'id'
    }
  },
  device_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'devices',
      key: 'id'
    }
  },
  verification_status: {
    type: DataTypes.ENUM('Pending', 'Approved', 'Rejected'),
    allowNull: false,
    defaultValue: 'Pending'
  },
  verification_notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  initial_physical_condition: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  accessories: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'bast_items',
  timestamps: true,
  underscored: true
});

module.exports = BastItem;
