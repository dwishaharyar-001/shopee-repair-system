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
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'Intake'
  },
  bast_status: {
    type: DataTypes.VIRTUAL,
    get() {
      return this.getDataValue('bast_status') || 'Pending_BAST';
    },
    set(val) {
      this.setDataValue('bast_status', val || 'Pending_BAST');
    }
  },
  sea_approval_decision: {
    type: DataTypes.VIRTUAL,
    get() {
      return this.getDataValue('sea_approval_decision') || null;
    },
    set(val) {
      this.setDataValue('sea_approval_decision', val || null);
    }
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
  assigned_tech_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  diagnostic_started_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  diagnostic_submitted_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  budget_approved_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  budget_approved_by_user_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  estimated_part_cost: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0.00
  },
  estimated_service_cost: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0.00
  },
  total_estimated_cost: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0.00
  },
  harvest_reason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  repair_started_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  repair_finished_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  qc1_started_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  qc1_finished_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  qc2_started_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  qc2_finished_at: {
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
