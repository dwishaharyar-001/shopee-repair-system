const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { sequelize } = require('./models');
const authRoutes = require('./routes/authRoutes');
const deviceRoutes = require('./routes/deviceRoutes');
const repairRoutes = require('./routes/repairRoutes');
const qcRoutes = require('./routes/qcRoutes');
const partsRoutes = require('./routes/partsRoutes');
const menuRoutes = require('./routes/menuRoutes');
const branchRoutes = require('./routes/branchRoutes');
const reportRoutes = require('./routes/reportRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors({
  origin: '*',
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'bypass-tunnel-reminder', 'ngrok-skip-browser-warning'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// API Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'online',
    service: 'Shopee Asset Repair System Backend',
    timestamp: new Date().toISOString()
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/repairs', repairRoutes);
app.use('/api/qc', qcRoutes);
app.use('/api/parts-inventory', partsRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api/reports', reportRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

const { ensureDefaultBranches } = require('./controllers/branchController');
const { ensureDefaultPermissions } = require('./controllers/menuController');

// Database Sync & Server Listen
const startServer = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Koneksi database berhasil terhubung.');
    
    await sequelize.sync();
    try {
      await sequelize.query('ALTER TABLE repair_logs ADD COLUMN diagnostics_outcome TEXT;');
    } catch (e) {}
    try {
      await sequelize.query('ALTER TABLE repair_logs ADD COLUMN repair_categories TEXT;');
    } catch (e) {}
    try {
      await sequelize.query('ALTER TABLE users ADD COLUMN signature_url TEXT;');
    } catch (e) {}
    console.log('✅ Skema tabel Sequelize berhasil di-sync.');

    await ensureDefaultBranches();
    await ensureDefaultPermissions();

    app.listen(PORT, '127.0.0.1', () => {
      console.log(`🚀 Server Shopee Repair API berjalan di http://127.0.0.1:${PORT}`);
    });
  } catch (error) {
    console.error('❌ Gagal menyalakan server:', error.message);
  }
};

startServer();
