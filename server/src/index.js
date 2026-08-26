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
    
    await sequelize.sync();
    console.log('✅ Skema tabel dasar Sequelize berhasil di-sync.');

    const directQueries = [
      "ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Intake';",
      "ALTER TABLE service_orders ALTER COLUMN status TYPE VARCHAR(50) USING status::text;",
      'ALTER TABLE "service_orders" ADD COLUMN IF NOT EXISTS "status" VARCHAR(50) DEFAULT \'Intake\';',
      "ALTER TABLE devices ADD COLUMN IF NOT EXISTS asset_type VARCHAR(100) DEFAULT 'Type A';",
      "ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS bast_status VARCHAR(50) DEFAULT 'Pending_BAST';",
      "ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS sea_approval_decision VARCHAR(50);",
      "ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS assigned_tech_at TIMESTAMP;",
      "ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS repair_started_at TIMESTAMP;",
      "ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS repair_finished_at TIMESTAMP;",
      "ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS qc1_started_at TIMESTAMP;",
      "ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS qc1_finished_at TIMESTAMP;",
      "ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS qc2_started_at TIMESTAMP;",
      "ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS qc2_finished_at TIMESTAMP;",
      "ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS diagnostic_started_at TIMESTAMP;",
      "ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS diagnostic_submitted_at TIMESTAMP;",
      "ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS budget_approved_at TIMESTAMP;",
      "ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS budget_approved_by_user_id INTEGER;",
      "ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS estimated_part_cost DECIMAL(12,2) DEFAULT 0;",
      "ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS estimated_service_cost DECIMAL(12,2) DEFAULT 0;",
      "ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS total_estimated_cost DECIMAL(12,2) DEFAULT 0;",
      "ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS harvest_reason TEXT;",
      "ALTER TABLE repair_logs ADD COLUMN IF NOT EXISTS duration_seconds INTEGER DEFAULT 0;",
      "ALTER TABLE repair_logs ADD COLUMN IF NOT EXISTS diagnostics_outcome TEXT;",
      "ALTER TABLE repair_logs ADD COLUMN IF NOT EXISTS repair_categories TEXT;",
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS signature_url TEXT;",
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS delete_status VARCHAR(20) DEFAULT 'none';",
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS qc_affiliation VARCHAR(20) DEFAULT 'Arisa';",
      "ALTER TABLE branches ADD COLUMN IF NOT EXISTS diagnostic_fee INTEGER DEFAULT 30000;"
    ];

    for (const q of directQueries) {
      try {
        await sequelize.query(q);
        console.log('✅ Migrasi skema sukses:', q);
      } catch (e) {
        console.error('Migration info:', q, '->', e.message);
      }
    }

    try {
      await sequelize.query(`
        UPDATE service_orders 
        SET bast_status = (
          SELECT bd.status 
          FROM bast_items bi 
          JOIN bast_documents bd ON bi.bast_document_id = bd.id 
          WHERE bi.service_order_id = service_orders.id 
          ORDER BY bd.id DESC 
          LIMIT 1
        ) 
        WHERE EXISTS (
          SELECT 1 
          FROM bast_items bi 
          JOIN bast_documents bd ON bi.bast_document_id = bd.id 
          WHERE bi.service_order_id = service_orders.id
        );
      `);
      await sequelize.query(`
        UPDATE service_orders 
        SET bast_status = (
          SELECT bd.status 
          FROM bast_items bi 
          JOIN bast_documents bd ON bi.bast_document_id = bd.id 
          WHERE bi.device_id = service_orders.device_id 
          ORDER BY bd.id DESC 
          LIMIT 1
        ) 
        WHERE EXISTS (
          SELECT 1 
          FROM bast_items bi 
          JOIN bast_documents bd ON bi.bast_document_id = bd.id 
          WHERE bi.device_id = service_orders.device_id
        );
      `);
      await sequelize.query(`
        UPDATE service_orders 
        SET assigned_technician_id = (
          SELECT t.id 
          FROM technicians t 
          WHERE t.user_id = service_orders.assigned_technician_id
        ) 
        WHERE EXISTS (
          SELECT 1 
          FROM technicians t 
          WHERE t.user_id = service_orders.assigned_technician_id
        );
      `);
      console.log('✅ Synchronized service_orders bast_status & technician assignment.');
    } catch (e) {}

    await ensureDefaultBranches();
    await ensureDefaultPermissions();
    await ensureDefaultUsers();
  } catch (error) {
    console.error('⚠️ Warning inisialisasi database:', error.message);
  }
};

initDatabase();
