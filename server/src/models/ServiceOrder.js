const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ServiceOrder = sequelize.define('ServiceOrder', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  service_id: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true
  },
  device_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'devices',
      key: 'id'
    }
  },
  customer_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'customers',
      key: 'id'
    }
  },
  branch_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'branches',
      key: 'id'
    }
  },
  fault_description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('Intake', 'In Repair', 'QC1 Pending', 'Rework', 'QC2 Pending', 'Released', 'Harvested'),
    allowNull: false,
    defaultValue: 'Intake'
  },
  assigned_technician_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'technicians',
      key: 'id'
    }
  },
  received_by_user_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  intake_date: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  released_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'service_orders',
  timestamps: true,
  underscored: true
});

module.exports = ServiceOrder;
