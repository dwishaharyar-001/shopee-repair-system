const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const HarvestLog = sequelize.define('HarvestLog', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  harvest_code: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true
  },
  source_device_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'devices',
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
  condition: {
    type: DataTypes.ENUM('Tested Good', 'Minor Wear', 'Refurbished'),
    defaultValue: 'Tested Good'
  },
  harvested_by_user_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  harvest_date: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'harvest_logs',
  timestamps: true,
  underscored: true
});

module.exports = HarvestLog;
