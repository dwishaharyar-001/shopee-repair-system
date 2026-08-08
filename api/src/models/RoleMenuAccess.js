const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const RoleMenuAccess = sequelize.define('RoleMenuAccess', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  role: {
    type: DataTypes.ENUM('Admin', 'Coordinator', 'QA_Liaison', 'Technician'),
    allowNull: false
  },
  menu_key: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  menu_label: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  is_allowed: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'role_menu_access',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      unique: true,
      fields: ['role', 'menu_key']
    }
  ]
});

module.exports = RoleMenuAccess;
