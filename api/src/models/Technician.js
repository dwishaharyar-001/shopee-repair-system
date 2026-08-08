const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Technician = sequelize.define('Technician', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  employee_code: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true
  },
  skill_level: {
    type: DataTypes.STRING(50),
    defaultValue: 'General Technician'
  },
  status: {
    type: DataTypes.ENUM('Available', 'Busy', 'On Leave'),
    defaultValue: 'Available'
  }
}, {
  tableName: 'technicians',
  timestamps: true,
  underscored: true
});

module.exports = Technician;
