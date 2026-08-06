const { Sequelize } = require('sequelize');
require('dotenv').config();

let sequelize;

// Priority 1: Supabase / Render / Railway Direct Connection String (DATABASE_URL)
if (process.env.DATABASE_URL) {
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
// Priority 2: Use SQLite for Local Development (if USE_SQLITE=true or no PostgreSQL environment set)
else if (process.env.USE_SQLITE === 'true' || !process.env.DB_NAME) {
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: './shopee_repair_dev.sqlite',
    logging: false
  });
} 
// Priority 3: Explicit PostgreSQL Environment Parameters
else {
  const dbHost = process.env.DB_HOST || 'localhost';
  const dbPort = process.env.DB_PORT || 5432;
  const dbName = process.env.DB_NAME || 'shopee_repair';
  const dbUser = process.env.DB_USER || 'postgres';
  const dbPassword = process.env.DB_PASSWORD || 'postgres';

  sequelize = new Sequelize(dbName, dbUser, dbPassword, {
    host: dbHost,
    port: dbPort,
    dialect: 'postgres',
    dialectOptions: (process.env.DB_SSL === 'true' || dbHost.includes('supabase')) ? {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    } : {},
    logging: false,
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  });
}

module.exports = { sequelize };
