const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const RepairLog = sequelize.define('RepairLog', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  repair_code: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true
  },
  service_order_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'service_orders',
      key: 'id'
    }
  },
  technician_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'technicians',
      key: 'id'
    }
  },
  action_taken: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  diagnostics_outcome: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  repair_categories: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  start_time: {
    type: DataTypes.DATE,
    allowNull: true
  },
  end_time: {
    type: DataTypes.DATE,
    allowNull: true
  },
  duration_minutes: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  duration_seconds: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  repair_status: {
    type: DataTypes.ENUM('In Progress', 'Paused', 'Completed', 'Rework Required'),
    defaultValue: 'In Progress'
  },
  rework_sla_deadline: {
    type: DataTypes.DATE,
    allowNull: true
  },
  rework_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
}, {
  tableName: 'repair_logs',
  timestamps: true,
  underscored: true
});

module.exports = RepairLog;
