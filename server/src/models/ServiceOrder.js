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
    type: DataTypes.VIRTUAL,
    get() { return this.getDataValue('assigned_tech_at') || null; },
    set(val) { this.setDataValue('assigned_tech_at', val); }
  },
  diagnostic_started_at: {
    type: DataTypes.VIRTUAL,
    get() { return this.getDataValue('diagnostic_started_at') || null; },
    set(val) { this.setDataValue('diagnostic_started_at', val); }
  },
  diagnostic_submitted_at: {
    type: DataTypes.VIRTUAL,
    get() { return this.getDataValue('diagnostic_submitted_at') || null; },
    set(val) { this.setDataValue('diagnostic_submitted_at', val); }
  },
  budget_approved_at: {
    type: DataTypes.VIRTUAL,
    get() { return this.getDataValue('budget_approved_at') || null; },
    set(val) { this.setDataValue('budget_approved_at', val); }
  },
  budget_approved_by_user_id: {
    type: DataTypes.VIRTUAL,
    get() { return this.getDataValue('budget_approved_by_user_id') || null; },
    set(val) { this.setDataValue('budget_approved_by_user_id', val); }
  },
  estimated_part_cost: {
    type: DataTypes.VIRTUAL,
    get() { return this.getDataValue('estimated_part_cost') || 0.00; },
    set(val) { this.setDataValue('estimated_part_cost', val); }
  },
  estimated_service_cost: {
    type: DataTypes.VIRTUAL,
    get() { return this.getDataValue('estimated_service_cost') || 0.00; },
    set(val) { this.setDataValue('estimated_service_cost', val); }
  },
  total_estimated_cost: {
    type: DataTypes.VIRTUAL,
    get() { return this.getDataValue('total_estimated_cost') || 0.00; },
    set(val) { this.setDataValue('total_estimated_cost', val); }
  },
  harvest_reason: {
    type: DataTypes.VIRTUAL,
    get() { return this.getDataValue('harvest_reason') || null; },
    set(val) { this.setDataValue('harvest_reason', val); }
  },
  repair_started_at: {
    type: DataTypes.VIRTUAL,
    get() { return this.getDataValue('repair_started_at') || null; },
    set(val) { this.setDataValue('repair_started_at', val); }
  },
  repair_finished_at: {
    type: DataTypes.VIRTUAL,
    get() { return this.getDataValue('repair_finished_at') || null; },
    set(val) { this.setDataValue('repair_finished_at', val); }
  },
  qc1_started_at: {
    type: DataTypes.VIRTUAL,
    get() { return this.getDataValue('qc1_started_at') || null; },
    set(val) { this.setDataValue('qc1_started_at', val); }
  },
  qc1_finished_at: {
    type: DataTypes.VIRTUAL,
    get() { return this.getDataValue('qc1_finished_at') || null; },
    set(val) { this.setDataValue('qc1_finished_at', val); }
  },
  qc2_started_at: {
    type: DataTypes.VIRTUAL,
    get() { return this.getDataValue('qc2_started_at') || null; },
    set(val) { this.setDataValue('qc2_started_at', val); }
  },
  qc2_finished_at: {
    type: DataTypes.VIRTUAL,
    get() { return this.getDataValue('qc2_finished_at') || null; },
    set(val) { this.setDataValue('qc2_finished_at', val); }
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
