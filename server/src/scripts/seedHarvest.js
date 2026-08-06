const { sequelize, HarvestLog, Device, Part, User } = require('../models');

const seedHarvest = async () => {
  try {
    console.log('Menghubungkan ke database untuk seeding harvest logs...');
    await sequelize.authenticate();
    await sequelize.sync();

    const adminUser = await User.findOne({ where: { role: 'Admin' } });
    const userId = adminUser ? adminUser.id : 1;

    const device = await Device.findOne();
    const part = await Part.findOne({ where: { category: 'Memory' } });

    if (device && part) {
      const existing = await HarvestLog.findOne();
      if (!existing) {
        console.log('Membuat sampel HarvestLog...');
        await HarvestLog.create({
          harvest_code: 'HARV-2026-0001',
          source_device_id: device.id,
          part_id: part.id,
          quantity: 2,
          condition: 'Tested Good',
          harvested_by_user_id: userId,
          notes: 'Pemanenan RAM SODIMM 16GB dari unit kanibal ThinkPad T14 yang mainboardnya terbakar.'
        });

        // Increase stock
        part.stock_quantity += 2;
        await part.save();
      }
    }

    console.log('✅ Seeding Harvest Logs berhasil!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Gagal seeder harvest:', error);
    process.exit(1);
  }
};

seedHarvest();
