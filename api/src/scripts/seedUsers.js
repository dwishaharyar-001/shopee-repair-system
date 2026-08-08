const bcrypt = require('bcryptjs');
const { sequelize, User, Technician } = require('../models');
const { ensureDefaultBranches } = require('../controllers/branchController');
const { ensureDefaultPermissions } = require('../controllers/menuController');

const seed = async () => {
  try {
    console.log('Menghubungkan ke database...');
    await sequelize.authenticate();
    console.log('Syncing database models...');
    await sequelize.sync({ force: true }); // Reset DB for seeding initial setup

    await ensureDefaultBranches();
    await ensureDefaultPermissions();

    const defaultPassword = 'password123';
    const passwordHash = await bcrypt.hash(defaultPassword, 10);

    console.log('Membuat data pengguna default...');

    // 1. Admin
    const admin = await User.create({
      username: 'admin',
      password_hash: passwordHash,
      full_name: 'System Administrator',
      email: 'admin@shopee-repair.local',
      role: 'Admin',
      is_active: true
    });

    // 2. Coordinators
    const coord1 = await User.create({
      username: 'coordinator1',
      password_hash: passwordHash,
      full_name: 'Budi Santoso (Coordinator)',
      email: 'budi.coord@shopee-repair.local',
      role: 'Coordinator',
      is_active: true
    });

    const coord2 = await User.create({
      username: 'coordinator2',
      password_hash: passwordHash,
      full_name: 'Siti Rahma (Coordinator)',
      email: 'siti.coord@shopee-repair.local',
      role: 'Coordinator',
      is_active: true
    });

    // 3. QA Liaisons
    const qa1 = await User.create({
      username: 'qa_arisa',
      password_hash: passwordHash,
      full_name: 'Dewi Lestari (QA Arisa)',
      email: 'dewi.qa@shopee-repair.local',
      role: 'QA_Liaison',
      is_active: true
    });

    const qa2 = await User.create({
      username: 'qa_shopee',
      password_hash: passwordHash,
      full_name: 'Rian Hidayat (QA Shopee)',
      email: 'rian.qa@shopee-repair.local',
      role: 'QA_Liaison',
      is_active: true
    });

    // 4. Technicians (8 Techs)
    const techData = [
      { name: 'Ahmad Fauzi', code: 'TECH-001', skill: 'Motherboard & Hardware Specialist' },
      { name: 'Deni Kurniawan', code: 'TECH-002', skill: 'Display & Hinges Specialist' },
      { name: 'Eko Prasetyo', code: 'TECH-003', skill: 'Keyboard & Peripheral Repair' },
      { name: 'Fajar Nugraha', code: 'TECH-004', skill: 'Thermal & Power Delivery' },
      { name: 'Gilang Ramadhan', code: 'TECH-005', skill: 'OS & Firmware Flashing' },
      { name: 'Hadi Wijaya', code: 'TECH-006', skill: 'Storage & RAM Diagnostics' },
      { name: 'Indra Gunawan', code: 'TECH-007', skill: 'General Hardware Repair' },
      { name: 'Joko Susilo', code: 'TECH-008', skill: 'General Hardware Repair' }
    ];

    for (let i = 0; i < techData.length; i++) {
      const techInfo = techData[i];
      const user = await User.create({
        username: `tech${i + 1}`,
        password_hash: passwordHash,
        full_name: techInfo.name,
        email: `tech${i + 1}@shopee-repair.local`,
        role: 'Technician',
        is_active: true
      });

      await Technician.create({
        user_id: user.id,
        employee_code: techInfo.code,
        skill_level: techInfo.skill,
        status: 'Available'
      });
    }

    console.log('✅ Seeding berhasil selesai!');
    console.log('--- KREDENSI DEFAULT LOGIN ---');
    console.log('Password untuk semua akun default adalah: password123');
    console.log('- Admin: admin');
    console.log('- Coordinator: coordinator1');
    console.log('- QA Liaison: qa_arisa, qa_shopee');
    console.log('- Technician: tech1 s/d tech8');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Gagal melakukan seeding database:', error);
    process.exit(1);
  }
};

seed();
