const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const QCCheckpoint = sequelize.define('QCCheckpoint', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  qc_code: {
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
  checkpoint_type: {
    type: DataTypes.ENUM('Checkpoint 1', 'Checkpoint 2'),
    allowNull: false
  },
  inspector_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  power_test: {
    type: DataTypes.ENUM('Pass', 'Fail', 'N/A'),
    defaultValue: 'Pass'
  },
  display_test: {
    type: DataTypes.ENUM('Pass', 'Fail', 'N/A'),
    defaultValue: 'Pass'
  },
  keyboard_test: {
    type: DataTypes.ENUM('Pass', 'Fail', 'N/A'),
    defaultValue: 'Pass'
  },
  storage_test: {
    type: DataTypes.ENUM('Pass', 'Fail', 'N/A'),
    defaultValue: 'Pass'
  },
  thermal_test: {
    type: DataTypes.ENUM('Pass', 'Fail', 'N/A'),
    defaultValue: 'Pass'
  },
  functional_test: {
    type: DataTypes.ENUM('Pass', 'Fail', 'N/A'),
    defaultValue: 'Pass'
  },
  physical_cosmetic_test: {
    type: DataTypes.ENUM('Pass', 'Fail', 'N/A'),
    defaultValue: 'Pass'
  },
  os_firmware_test: {
    type: DataTypes.ENUM('Pass', 'Fail', 'N/A'),
    defaultValue: 'Pass'
  },
  overall_result: {
    type: DataTypes.ENUM('Passed', 'Rejected'),
    allowNull: false
  },
  failure_reason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  rework_notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  qc_date: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'qc_checkpoints',
  timestamps: true,
  underscored: true
});

module.exports = QCCheckpoint;
