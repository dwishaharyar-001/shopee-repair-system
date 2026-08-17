const { Sequelize } = require('sequelize');
require('dotenv').config();

let sequelize;

const cloudDbUrl = process.env.DATABASE_URL || 'postgresql://postgres.hvfdhrwktiqbkmbdadre:19April24%24%24%23%21@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres';

// Priority 1: Use SQLite ONLY when explicitly running local dev with USE_SQLITE=true on non-Vercel
if (process.env.USE_SQLITE === 'true' && !process.env.VERCEL) {
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: './shopee_repair_dev.sqlite',
    logging: false
  });
} 
// Priority 2: Supabase PostgreSQL (Cloud Database for Vercel & Production)
else if (cloudDbUrl) {
  sequelize = new Sequelize(cloudDbUrl, {
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
// Priority 3: Fallback PostgreSQL from individual env vars
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
