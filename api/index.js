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

// Safe body parser for Vercel Serverless (Prevents hanging on already-consumed streams)
app.use((req, res, next) => {
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === 'string' && req.body.length > 0) {
      try {
        req.body = JSON.parse(req.body);
      } catch (e) {}
    }
    return next();
  }
  express.json({ limit: '10mb' })(req, res, (err) => {
    if (err) {
      return res.status(400).json({ success: false, message: 'Invalid JSON payload' });
    }
    express.urlencoded({ extended: true, limit: '10mb' })(req, res, next);
  });
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

// Mount routes with explicit path prefixes (handles Vercel rewrite with or without /api)
app.use('/api/auth', authRoutes);
app.use('/auth', authRoutes);

app.use('/api/devices', deviceRoutes);
app.use('/devices', deviceRoutes);

app.use('/api/repairs', repairRoutes);
app.use('/repairs', repairRoutes);

app.use('/api/qc', qcRoutes);
app.use('/qc', qcRoutes);

app.use('/api/parts-inventory', partsRoutes);
app.use('/parts-inventory', partsRoutes);

app.use('/api/menu', menuRoutes);
app.use('/menu', menuRoutes);

app.use('/api/branches', branchRoutes);
app.use('/branches', branchRoutes);

app.use('/api/reports', reportRoutes);
app.use('/reports', reportRoutes);

// Fallback direct root mount for auth routes (e.g. /login, /me)
app.use('/', authRoutes);

// 404 Unmatched Route Handler
app.use((req, res) => {
  return res.status(404).json({
    success: false,
    message: `Endpoint '${req.method} ${req.originalUrl || req.url}' tidak ditemukan pada Vercel API.`,
    debug: {
      url: req.url,
      originalUrl: req.originalUrl,
      baseUrl: req.baseUrl,
      path: req.path
    }
  });
});

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
