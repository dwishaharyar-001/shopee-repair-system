const { Sequelize } = require('sequelize');
const path = require('path');

// Auto load .env from server root or workspace root
require('dotenv').config({ path: path.join(__dirname, '../../../.env') });
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
require('dotenv').config();

let sequelize;

// Priority 1: Use SQLite explicitly (Self-contained, fast, zero-dependency for VPS & Dev)
if (process.env.USE_SQLITE === 'true') {
  const sqliteStoragePath = process.env.SQLITE_PATH || path.join(__dirname, '../../shopee_repair.sqlite');
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: sqliteStoragePath,
    logging: false
  });
}
// Priority 2: PostgreSQL via DATABASE_URL (e.g. Supabase, Render, Railway, Neon, AWS RDS)
else if (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('localhost')) {
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    },
    logging: false,
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  });
} 
// Priority 3: Custom PostgreSQL individual environment variables (if DB_HOST & DB_PASSWORD configured)
else if (process.env.DB_HOST && process.env.DB_USER && process.env.DB_PASSWORD) {
  sequelize = new Sequelize(process.env.DB_NAME || 'shopee_repair', process.env.DB_USER, process.env.DB_PASSWORD, {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    dialectOptions: process.env.DB_SSL === 'true' ? { ssl: { require: true, rejectUnauthorized: false } } : {},
    logging: false,
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  });
}
// Priority 4: Default SQLite Fallback (Zero-config fallback for VPS production)
else {
  const sqliteStoragePath = process.env.SQLITE_PATH || path.join(__dirname, '../../shopee_repair.sqlite');
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: sqliteStoragePath,
    logging: false
  });
}

module.exports = { sequelize };
