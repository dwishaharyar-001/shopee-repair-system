const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { sequelize, User } = require('./src/models');
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

// Pre-parsed body fallback for Vercel
app.use((req, res, next) => {
  if (typeof req.body === 'string' && req.body.length > 0) {
    try {
      req.body = JSON.parse(req.body);
    } catch (e) {}
  }
  next();
});

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

// Direct Login Test Endpoint (Bypasses Router to verify controller execution)
app.post(['/api/direct-login', '/direct-login'], async (req, res) => {
  const bcrypt = require('bcryptjs');
  const jwt = require('jsonwebtoken');
  const { User, Technician, Branch } = require('./src/models');
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username dan password wajib diisi.' });
    }
    const user = await User.findOne({
      where: { username },
      include: [
        { model: Technician, as: 'technicianProfile', required: false },
        { model: Branch, as: 'branch', required: false }
      ]
    });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Username tidak ditemukan.' });
    }
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Password salah.' });
    }
    const secret = process.env.JWT_SECRET || 'shopee_asset_repair_super_secret_jwt_key_2026';
    const token = jwt.sign({ id: user.id, username: user.username, role: user.role, branch_id: user.branch_id }, secret, { expiresIn: '24h' });
    return res.status(200).json({
      success: true,
      message: 'Direct login test berhasil!',
      data: { token, user: { id: user.id, username: user.username, role: user.role } }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message, stack: err.stack });
  }
});

// Database Debug Endpoint for Serverless
app.get(['/api/debug-db', '/debug-db'], async (req, res) => {
  try {
    await sequelize.authenticate();
    const userCount = await User.count();
    const sampleUser = await User.findOne({ attributes: ['id', 'username', 'role', 'is_active'] });
    return res.status(200).json({
      success: true,
      message: 'Database connection and query successful!',
      userCount,
      sampleUser
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Database query failed in serverless environment.',
      error: error.message,
      stack: error.stack
    });
  }
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

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Error in Serverless API:', err);
  return res.status(500).json({
    success: false,
    message: 'Serverless Error: ' + err.message,
    error: err.toString()
  });
});

module.exports = app;
