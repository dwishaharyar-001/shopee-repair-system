const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const PartConsumed = sequelize.define('PartConsumed', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  service_order_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'service_orders',
      key: 'id'
    }
  },
  repair_log_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'repair_logs',
      key: 'id'
    }
  },
  part_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'parts',
      key: 'id'
    }
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1
  },
  unit_cost: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00
  },
  total_cost: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00
  },
  requested_by_user_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  }
}, {
  tableName: 'parts_consumed',
  timestamps: true,
  underscored: true
});

module.exports = PartConsumed;
