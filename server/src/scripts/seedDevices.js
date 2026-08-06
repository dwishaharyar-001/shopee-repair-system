const { sequelize, Customer, Device, ServiceOrder, Technician, User } = require('../models');

const seedDevices = async () => {
  try {
    console.log('Menghubungkan ke database untuk seeding devices...');
    await sequelize.authenticate();

    // 1. Seed Customers
    let shopee = await Customer.findOne({ where: { customer_code: 'CUST-SHOPEE' } });
    if (!shopee) {
      shopee = await Customer.create({
        customer_code: 'CUST-SHOPEE',
        name: 'Shopee Indonesia (HQ Asset)',
        contact_email: 'asset-mgmt@shopee.co.id',
        phone: '+6221-5099-8800',
        address: 'Pacific Century Place, SCBD, Jakarta'
      });
    }

    let arisa = await Customer.findOne({ where: { customer_code: 'CUST-ARISA' } });
    if (!arisa) {
      arisa = await Customer.create({
        customer_code: 'CUST-ARISA',
        name: 'Arisa Technical Service Center',
        contact_email: 'service@arisa-tech.id',
        phone: '+6221-5800-1122',
        address: 'Kawasan Industri Pulogadung, Jakarta Timur'
      });
    }

    let dti = await Customer.findOne({ where: { customer_code: 'CUST-DTI' } });
    if (!dti) {
      dti = await Customer.create({
        customer_code: 'CUST-DTI',
        name: 'DTI Warehouse & Logistics',
        contact_email: 'logistics@dti-corp.id',
        phone: '+6221-8900-3344',
        address: 'Kawasan Industri MM2100, Cikarang'
      });
    }

    // Get Technicians & Admin user
    const technicians = await Technician.findAll();
    const adminUser = await User.findOne({ where: { role: 'Admin' } });

    // 2. Sample Assets & Service Orders Data
    const sampleAssets = [
      {
        serial: 'SN-THINK-2026-001',
        brand: 'Lenovo',
        model: 'ThinkPad T14 Gen 3',
        type: 'Type A',
        customer: shopee,
        fault: 'Layar LCD bergaris hitam dan touchpad tidak merespons.',
        status: 'In Repair',
        techIndex: 0
      },
      {
        serial: 'SN-DELL-2026-002',
        brand: 'Dell',
        model: 'OptiPlex 7090 Tower',
        type: 'Type B',
        customer: shopee,
        fault: 'Komputer mati total, bunyi beep 3x saat tombol power ditekan.',
        status: 'QC1 Pending',
        techIndex: 1
      },
      {
        serial: 'SN-MAC-2026-003',
        brand: 'Apple',
        model: 'MacBook Pro M2 14-inch',
        type: 'Type A',
        customer: arisa,
        fault: 'Baterai membesar (swollen battery) dan thermal throttling panas berlebih.',
        status: 'Rework',
        techIndex: 2
      },
      {
        serial: 'SN-MON-2026-004',
        brand: 'LG',
        model: 'UltraFine 27-inch 4K',
        type: 'Type C',
        customer: shopee,
        fault: 'Port USB-C Display Output tidak terdeteksi oleh laptop.',
        status: 'QC2 Pending',
        techIndex: 3
      },
      {
        serial: 'SN-NAS-2026-005',
        brand: 'Synology',
        model: 'DiskStation DS920+',
        type: 'Type D',
        customer: dti,
        fault: 'Harddisk Bay 3 indikator LED merah RAID Degraded.',
        status: 'Intake',
        techIndex: 4
      },
      {
        serial: 'SN-HP-2026-006',
        brand: 'HP',
        model: 'EliteBook 840 G8',
        type: 'Type A',
        customer: shopee,
        fault: 'Keyboard beberapa tombol (Q, W, E, R) macet dan mati.',
        status: 'Released',
        techIndex: 5
      },
      {
        serial: 'SN-CISCO-2026-007',
        brand: 'Cisco',
        model: 'Catalyst 2960X Switch',
        type: 'Type E',
        customer: dti,
        fault: 'Port 1 sampai 8 mati akibat terkena lonjakan listrik (surge).',
        status: 'In Repair',
        techIndex: 6
      },
      {
        serial: 'SN-ASUS-2026-008',
        brand: 'ASUS',
        model: 'ExpertBook B9',
        type: 'Type A',
        customer: arisa,
        fault: 'Sistem operasi corrup tidak bisa booting ke Windows 11.',
        status: 'Intake',
        techIndex: 7
      }
    ];

    console.log('Membuat data sample Devices & Service Orders...');
    for (let i = 0; i < sampleAssets.length; i++) {
      const item = sampleAssets[i];

      // Check or create device
      let device = await Device.findOne({ where: { serial_number: item.serial } });
      if (!device) {
        device = await Device.create({
          device_id: `DEV-2026-${String(i + 1).padStart(4, '0')}`,
          serial_number: item.serial,
          brand: item.brand,
          model: item.model,
          asset_type: item.type,
          customer_id: item.customer.id
        });
      }

      // Check or create service order
      let serviceOrder = await ServiceOrder.findOne({ where: { device_id: device.id } });
      if (!serviceOrder) {
        const assignedTech = technicians[item.techIndex % technicians.length];
        await ServiceOrder.create({
          service_id: `SVC-2026-${String(i + 1).padStart(4, '0')}`,
          device_id: device.id,
          customer_id: item.customer.id,
          fault_description: item.fault,
          status: item.status,
          assigned_technician_id: assignedTech ? assignedTech.id : null,
          received_by_user_id: adminUser ? adminUser.id : null,
          intake_date: new Date(Date.now() - (i * 86400000)), // spaced by days
          released_date: item.status === 'Released' ? new Date() : null,
          notes: `Inspeksi awal oleh tim QC Arisa / Shopee.`
        });
      }
    }

    console.log('✅ Seeding Devices & Service Orders berhasil!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Gagal seeder devices:', error);
    process.exit(1);
  }
};

seedDevices();
