const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Enforce cloud Supabase PostgreSQL on Vercel
process.env.USE_SQLITE = 'false';
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://postgres.hvfdhrwktiqbkmbdadre:19April24%24%24%23%21@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres';
}

const { sequelize } = require('../server/src/models');
const authRoutes = require('../server/src/routes/authRoutes');
const deviceRoutes = require('../server/src/routes/deviceRoutes');
const repairRoutes = require('../server/src/routes/repairRoutes');
const qcRoutes = require('../server/src/routes/qcRoutes');
const partsRoutes = require('../server/src/routes/partsRoutes');
const menuRoutes = require('../server/src/routes/menuRoutes');
const branchRoutes = require('../server/src/routes/branchRoutes');
const reportRoutes = require('../server/src/routes/reportRoutes');

const app = express();

app.use(cors({
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health Check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'online',
    mode: 'vercel-serverless',
    database: 'supabase-postgresql',
    service: 'Shopee Asset Repair API',
    timestamp: new Date().toISOString()
  });
});

// Sync database on cold start if needed
let isDbSynced = false;
app.use(async (req, res, next) => {
  if (!isDbSynced) {
    try {
      await sequelize.sync();
      try { await sequelize.query('ALTER TABLE repair_logs ADD COLUMN duration_seconds INTEGER DEFAULT 0;'); } catch (e) {}
      try { await sequelize.query('ALTER TABLE repair_logs ADD COLUMN diagnostics_outcome TEXT;'); } catch (e) {}
      try { await sequelize.query('ALTER TABLE repair_logs ADD COLUMN repair_categories TEXT;'); } catch (e) {}
      try { await sequelize.query('ALTER TABLE users ADD COLUMN signature_url TEXT;'); } catch (e) {}
      try { await sequelize.query("ALTER TABLE users ADD COLUMN delete_status VARCHAR(20) DEFAULT 'none';"); } catch (e) {}
      try { await sequelize.query("ALTER TABLE users ADD COLUMN qc_affiliation VARCHAR(20) DEFAULT 'Arisa';"); } catch (e) {}
      isDbSynced = true;
    } catch (err) {
      console.error('Vercel serverless DB sync error:', err.message);
    }
  }
  next();
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/repairs', repairRoutes);
app.use('/api/qc', qcRoutes);
app.use('/api/parts-inventory', partsRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api/reports', reportRoutes);

module.exports = app;
