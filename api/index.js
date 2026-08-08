const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { sequelize } = require('./src/models');
const authRoutes = require('./src/routes/authRoutes');
const deviceRoutes = require('./src/routes/deviceRoutes');
const repairRoutes = require('./src/routes/repairRoutes');
const qcRoutes = require('./src/routes/qcRoutes');
const partsRoutes = require('./src/routes/partsRoutes');
const menuRoutes = require('./src/routes/menuRoutes');
const branchRoutes = require('./src/routes/branchRoutes');
const reportRoutes = require('./src/routes/reportRoutes');

const app = express();

app.use(cors({
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'bypass-tunnel-reminder', 'ngrok-skip-browser-warning']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health Check
app.get(['/api/health', '/health'], (req, res) => {
  res.status(200).json({
    status: 'online',
    mode: 'vercel-serverless',
    database: 'supabase-postgresql',
    service: 'Shopee Asset Repair Cloud API',
    timestamp: new Date().toISOString()
  });
});

// Dual Mount Routes (handles both with and without /api prefix on Vercel)
app.use(['/api/auth', '/auth'], authRoutes);
app.use(['/api/devices', '/devices'], deviceRoutes);
app.use(['/api/repairs', '/repairs'], repairRoutes);
app.use(['/api/qc', '/qc'], qcRoutes);
app.use(['/api/parts-inventory', '/parts-inventory'], partsRoutes);
app.use(['/api/menu', '/menu'], menuRoutes);
app.use(['/api/branches', '/branches'], branchRoutes);
app.use(['/api/reports', '/reports'], reportRoutes);

module.exports = app;
