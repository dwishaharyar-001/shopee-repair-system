const { sequelize, Part, ServiceOrder, RepairLog, PartConsumed, Technician } = require('../models');

const seedRepairs = async () => {
  try {
    console.log('Menghubungkan ke database untuk seeding catalog spare parts...');
    await sequelize.authenticate();
    console.log('Syncing database tables...');
    await sequelize.sync(); // Creates missing tables safely in SQLite without ALTER constraint drops

    // 1. Catalog Parts
    const partsCatalog = [
      { part_number: 'RAM-DDR4-16G', name: 'SODIMM DDR4 16GB 3200MHz Laptop RAM', category: 'Memory', stock: 45, cost: 450000, min: 10 },
      { part_number: 'RAM-DDR4-8G', name: 'SODIMM DDR4 8GB 3200MHz Laptop RAM', category: 'Memory', stock: 60, cost: 250000, min: 10 },
      { part_number: 'SSD-NVME-512G', name: 'M.2 NVMe SSD 512GB PCIe Gen3', category: 'Storage', stock: 30, cost: 550000, min: 8 },
      { part_number: 'SSD-SATA-1TB', name: '2.5-inch SATA SSD 1TB Enterprise', category: 'Storage', stock: 20, cost: 850000, min: 5 },
      { part_number: 'LCD-T14-FHD', name: '14.0-inch FHD IPS LCD Panel (ThinkPad T14)', category: 'Display', stock: 12, cost: 1250000, min: 3 },
      { part_number: 'LCD-DELL-24', name: '24-inch LED Backlight Panel (Dell OptiPlex)', category: 'Display', stock: 8, cost: 1600000, min: 2 },
      { part_number: 'KBD-THINK-US', name: 'Backlit US English Keyboard (ThinkPad T14)', category: 'Keyboard', stock: 25, cost: 350000, min: 5 },
      { part_number: 'BAT-MBP-14', name: 'Lithium-Polymer Battery 70Wh (MacBook Pro 14)', category: 'Battery', stock: 10, cost: 1450000, min: 3 },
      { part_number: 'BAT-THINK-57W', name: 'Internal Battery 57Wh (ThinkPad T14)', category: 'Battery', stock: 18, cost: 750000, min: 4 },
      { part_number: 'FAN-HEAT-T14', name: 'Dual Heatpipe Cooling Fan (ThinkPad T14)', category: 'Thermal', stock: 15, cost: 280000, min: 5 },
      { part_number: 'PASTE-MX4-4G', name: 'ARCTIC MX-4 High Performance Thermal Compound', category: 'Thermal', stock: 50, cost: 85000, min: 10 },
      { part_number: 'PWR-DELL-300W', name: '300W 80+ Bronze Power Supply (Dell Tower)', category: 'Power', stock: 14, cost: 650000, min: 4 },
      { part_number: 'CHARGER-TYPEC-65W', name: '65W USB-C PD GaN Power Adapter', category: 'Power', stock: 40, cost: 220000, min: 10 }
    ];

    console.log('Seeding katalog spare parts...');
    for (const p of partsCatalog) {
      const existing = await Part.findOne({ where: { part_number: p.part_number } });
      if (!existing) {
        await Part.create({
          part_number: p.part_number,
          name: p.name,
          category: p.category,
          stock_quantity: p.stock,
          unit_cost: p.cost,
          min_stock_trigger: p.min
        });
      }
    }

    // 2. Initial Repair Logs & Parts Consumed for sample Service Orders
    const orders = await ServiceOrder.findAll();
    const ramPart = await Part.findOne({ where: { part_number: 'RAM-DDR4-16G' } });
    const tech = await Technician.findOne();

    for (let i = 0; i < Math.min(3, orders.length); i++) {
      const order = orders[i];
      let log = await RepairLog.findOne({ where: { service_order_id: order.id } });
      if (!log) {
        log = await RepairLog.create({
          repair_code: `REP-2026-${String(i + 1).padStart(4, '0')}`,
          service_order_id: order.id,
          technician_id: tech ? tech.id : 1,
          action_taken: 'Penggantian RAM 16GB dan pembersihan thermal fan.',
          start_time: new Date(Date.now() - 3600000), // 1 hour ago
          end_time: new Date(),
          duration_minutes: 45,
          repair_status: order.status === 'Rework' ? 'Rework Required' : 'Completed',
          rework_sla_deadline: order.status === 'Rework' ? new Date(Date.now() + (48 * 3600000)) : null,
          rework_count: order.status === 'Rework' ? 1 : 0
        });

        // Add sample consumed parts
        if (ramPart) {
          await PartConsumed.create({
            service_order_id: order.id,
            repair_log_id: log.id,
            part_id: ramPart.id,
            quantity: 1,
            unit_cost: ramPart.unit_cost,
            total_cost: ramPart.unit_cost
          });
        }
      }
    }

    console.log('✅ Seeding katalog spare parts & repair logs berhasil!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Gagal seeder repairs:', error);
    process.exit(1);
  }
};

seedRepairs();
