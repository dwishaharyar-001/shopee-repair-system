const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const BastDocument = sequelize.define('BastDocument', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  bast_number: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true
  },
  bast_type: {
    type: DataTypes.ENUM('1', '2', '3'), // '1': Shopee -> Arisa Intake Daily, '2': Arisa -> Shopee Return Weekly, '3': Used Parts Weekly
    allowNull: false,
    defaultValue: '1'
  },
  intake_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  start_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  end_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  branch_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'branches',
      key: 'id'
    }
  },
  status: {
    type: DataTypes.ENUM('Draft', 'Submitted_to_SEA', 'Approved_SEA', 'Revision_Requested', 'Rejected'),
    allowNull: false,
    defaultValue: 'Draft'
  },
  first_party_user_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  first_party_title: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  first_party_signature: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  second_party_user_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  second_party_title: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  second_party_signature: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  rejection_reason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  submitted_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  verified_at: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'bast_documents',
  timestamps: true,
  underscored: true
});

module.exports = BastDocument;
