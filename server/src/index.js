const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
require('dotenv').config();

// Process-Level Exception Protection to prevent Node process termination
process.on('uncaughtException', (err) => {
  console.error('🛡️ Process Protection - Uncaught Exception Caught:', err.stack || err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('🛡️ Process Protection - Unhandled Rejection at:', promise, 'reason:', reason);
});

const { sequelize, User, Technician, Branch } = require('./models');
const authRoutes = require('./routes/authRoutes');
const deviceRoutes = require('./routes/deviceRoutes');
const repairRoutes = require('./routes/repairRoutes');
const qcRoutes = require('./routes/qcRoutes');
const partsRoutes = require('./routes/partsRoutes');
const menuRoutes = require('./routes/menuRoutes');
const branchRoutes = require('./routes/branchRoutes');
const reportRoutes = require('./routes/reportRoutes');
const bastRoutes = require('./routes/bastRoutes');
const diagnosticRoutes = require('./routes/diagnosticRoutes');

const { ensureDefaultBranches } = require('./controllers/branchController');
const { ensureDefaultPermissions } = require('./controllers/menuController');

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
app.get(['/api/health', '/health'], (req, res) => {
  res.status(200).json({
    status: 'online',
    service: 'ARISA Service System Backend (VPS)',
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
app.use('/api/bast', bastRoutes);
app.use('/api/diagnostics', diagnosticRoutes);

// Fallback direct routes
app.use('/auth', authRoutes);
app.use('/bast', bastRoutes);
app.use('/diagnostics', diagnosticRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Error in Backend API:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

/**
 * Auto-Seed Default Users if DB is fresh
 */
const ensureDefaultUsers = async () => {
  try {
    const passwordHash = await bcrypt.hash('password123', 10);
    const defaultBranch = await Branch.findOne();
    const branchId = defaultBranch ? defaultBranch.id : 1;

    // Ensure default admin account exists only if not already created
    const adminUser = await User.findOne({ where: { username: 'admin' } });
    if (!adminUser) {
      await User.create({
        username: 'admin',
        password_hash: passwordHash,
        full_name: 'System Administrator',
        email: 'admin@shopee-repair.local',
        role: 'Admin',
        branch_id: branchId,
        is_active: true
      });
      console.log('✅ Default admin user created.');
    }

    const userCount = await User.count();
    if (userCount <= 1) {
      console.log('Seeding remaining default system users...');

      // 2. Coordinators
      await User.create({
        username: 'coordinator1',
        password_hash: passwordHash,
        full_name: 'Coordinator Hub Jakarta',
        email: 'coordinator1@shopee-repair.local',
        role: 'Coordinator',
        branch_id: branchId,
        is_active: true
      });

      await User.create({
        username: 'coordinator2',
        password_hash: passwordHash,
        full_name: 'Coordinator Hub Bandung',
        email: 'coordinator2@shopee-repair.local',
        role: 'Coordinator',
        branch_id: branchId,
        is_active: true
      });

      // 3. QA Liaisons
      await User.create({
        username: 'qa_shopee',
        password_hash: passwordHash,
        full_name: 'Rian Hidayat (QA Shopee)',
        email: 'rian.qa@shopee-repair.local',
        role: 'QA_Liaison',
        is_active: true
      });

      await User.create({
        username: 'qa_arisa',
        password_hash: passwordHash,
        full_name: 'Dewi Lestari (QA Arisa)',
        email: 'dewi.qa@shopee-repair.local',
        role: 'QA_Liaison',
        is_active: true
      });

      // 4. Default Technicians
      const techUser = await User.create({
        username: 'nova',
        password_hash: passwordHash,
        full_name: 'Nova Pratama',
        email: 'nova.tech@shopee-repair.local',
        role: 'Technician',
        branch_id: branchId,
        is_active: true
      });

      await Technician.create({
        user_id: techUser.id,
        employee_code: 'TECH-009',
        skill_level: 'Senior',
        status: 'Available'
      });

      for (let i = 1; i <= 8; i++) {
        const u = await User.create({
          username: `tech${i}`,
          password_hash: passwordHash,
          full_name: `Technician ${i}`,
          email: `tech${i}@shopee-repair.local`,
          role: 'Technician',
          branch_id: branchId,
          is_active: true
        });

        await Technician.create({
          user_id: u.id,
          employee_code: `TECH-00${i}`,
          skill_level: 'Standard',
          status: 'Available'
        });
      }

      console.log('✅ Default users seeded successfully with password: password123');
    }
  } catch (err) {
    console.error('Error ensuring default users:', err.message);
  }
};

// Start Express HTTP Server FIRST so port 3000 is immediately open for Nginx
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server ARISA Service System Backend berjalan di port ${PORT}`);
});

// Database Sync & Async Initialization
const initDatabase = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Koneksi database berhasil terhubung.');
    
    const queryInterface = sequelize.getQueryInterface();
    const { DataTypes: DT } = require('sequelize');

    const columnsToAdd = [
      { table: 'devices', column: 'asset_type', attr: { type: DT.STRING(100), allowNull: true, defaultValue: 'Type A' } },
      { table: 'service_orders', column: 'bast_status', attr: { type: DT.STRING(50), allowNull: true, defaultValue: 'Pending_BAST' } },
      { table: 'service_orders', column: 'sea_approval_decision', attr: { type: DT.STRING(50), allowNull: true } },
      { table: 'service_orders', column: 'assigned_tech_at', attr: { type: DT.DATE, allowNull: true } },
      { table: 'service_orders', column: 'repair_started_at', attr: { type: DT.DATE, allowNull: true } },
      { table: 'service_orders', column: 'repair_finished_at', attr: { type: DT.DATE, allowNull: true } },
      { table: 'service_orders', column: 'qc1_started_at', attr: { type: DT.DATE, allowNull: true } },
      { table: 'service_orders', column: 'qc1_finished_at', attr: { type: DT.DATE, allowNull: true } },
      { table: 'service_orders', column: 'qc2_started_at', attr: { type: DT.DATE, allowNull: true } },
      { table: 'service_orders', column: 'qc2_finished_at', attr: { type: DT.DATE, allowNull: true } },
      { table: 'service_orders', column: 'diagnostic_started_at', attr: { type: DT.DATE, allowNull: true } },
      { table: 'service_orders', column: 'diagnostic_submitted_at', attr: { type: DT.DATE, allowNull: true } },
      { table: 'service_orders', column: 'budget_approved_at', attr: { type: DT.DATE, allowNull: true } },
      { table: 'service_orders', column: 'budget_approved_by_user_id', attr: { type: DT.INTEGER, allowNull: true } },
      { table: 'service_orders', column: 'estimated_part_cost', attr: { type: DT.DECIMAL(12, 2), defaultValue: 0.00 } },
      { table: 'service_orders', column: 'estimated_service_cost', attr: { type: DT.DECIMAL(12, 2), defaultValue: 0.00 } },
      { table: 'service_orders', column: 'total_estimated_cost', attr: { type: DT.DECIMAL(12, 2), defaultValue: 0.00 } },
      { table: 'service_orders', column: 'harvest_reason', attr: { type: DT.TEXT, allowNull: true } },
      { table: 'repair_logs', column: 'duration_seconds', attr: { type: DT.INTEGER, defaultValue: 0 } },
      { table: 'repair_logs', column: 'diagnostics_outcome', attr: { type: DT.TEXT, allowNull: true } },
      { table: 'repair_logs', column: 'repair_categories', attr: { type: DT.TEXT, allowNull: true } },
      { table: 'users', column: 'signature_url', attr: { type: DT.TEXT, allowNull: true } },
      { table: 'users', column: 'delete_status', attr: { type: DT.STRING(20), defaultValue: 'none' } },
      { table: 'users', column: 'qc_affiliation', attr: { type: DT.STRING(20), defaultValue: 'Arisa' } },
      { table: 'branches', column: 'diagnostic_fee', attr: { type: DT.INTEGER, defaultValue: 30000 } }
    ];

    for (const item of columnsToAdd) {
      try {
        await queryInterface.addColumn(item.table, item.column, item.attr);
      } catch (e) {}
    }

    try { await sequelize.query("UPDATE users SET is_active = false WHERE role = 'Technician' AND (branch_id IS NULL OR branch_id = 0);"); } catch (e) {}

    await sequelize.sync();
    console.log('✅ Skema tabel Sequelize & PostgreSQL berhasil di-sync.');

    await ensureDefaultBranches();
    await ensureDefaultPermissions();
    await ensureDefaultUsers();
  } catch (error) {
    console.error('⚠️ Warning inisialisasi database:', error.message);
  }
};

initDatabase();
