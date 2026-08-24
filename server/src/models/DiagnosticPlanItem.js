const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const DiagnosticPlanItem = sequelize.define('DiagnosticPlanItem', {
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
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0.00
  },
  total_cost: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0.00
  },
  category_name: {
    type: DataTypes.STRING(150),
    allowNull: true
  },
  approval_status: {
    type: DataTypes.ENUM('Pending', 'Approved', 'Rejected'),
    allowNull: false,
    defaultValue: 'Pending'
  }
}, {
  tableName: 'diagnostic_plan_items',
  timestamps: true,
  underscored: true
});

module.exports = DiagnosticPlanItem;
