const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  username: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true
  },
  password_hash: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  full_name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: true,
    validate: {
      isEmail: true
    }
  },
  role: {
    type: DataTypes.ENUM('Admin', 'Coordinator', 'QA_Liaison', 'Technician'),
    allowNull: false,
    defaultValue: 'Technician'
  },
  branch_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'branches',
      key: 'id'
    }
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  delete_status: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'none' // 'none', 'pending_delete'
  },
  signature_url: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  qc_affiliation: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'Arisa' // 'Shopee' or 'Arisa'
  }
}, {
  tableName: 'users',
  timestamps: true,
  underscored: true
});

module.exports = User;
