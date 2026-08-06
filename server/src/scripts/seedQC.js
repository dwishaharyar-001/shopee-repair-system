const { sequelize, QCCheckpoint, ServiceOrder, User } = require('../models');

const seedQC = async () => {
  try {
    console.log('Menghubungkan ke database untuk seeding QC Checkpoints...');
    await sequelize.authenticate();
    await sequelize.sync();

    const qaUser = await User.findOne({ where: { role: 'QA_Liaison' } });
    const inspectorId = qaUser ? qaUser.id : 1;

    const orders = await ServiceOrder.findAll();

    console.log('Membuat data sampel QC Checkpoints...');
    for (let i = 0; i < Math.min(4, orders.length); i++) {
      const order = orders[i];
      const existingQC = await QCCheckpoint.findOne({ where: { service_order_id: order.id } });

      if (!existingQC) {
        // QC Checkpoint 1 (Arisa)
        await QCCheckpoint.create({
          qc_code: `QC-2026-${String(i + 1).padStart(4, '0')}`,
          service_order_id: order.id,
          checkpoint_type: 'Checkpoint 1',
          inspector_id: inspectorId,
          power_test: 'Pass',
          display_test: i === 2 ? 'Fail' : 'Pass',
          keyboard_test: 'Pass',
          storage_test: 'Pass',
          thermal_test: 'Pass',
          overall_result: i === 2 ? 'Rejected' : 'Passed',
          failure_reason: i === 2 ? 'Layar LCD masih berkedip (flickering) saat thermal load 100%.' : null,
          qc_date: new Date(Date.now() - (i * 43200000))
        });

        // QC Checkpoint 2 (Shopee) for passed ones
        if (i !== 2) {
          await QCCheckpoint.create({
            qc_code: `QC-2026-${String(i + 10).padStart(4, '0')}`,
            service_order_id: order.id,
            checkpoint_type: 'Checkpoint 2',
            inspector_id: inspectorId,
            functional_test: 'Pass',
            physical_cosmetic_test: 'Pass',
            os_firmware_test: 'Pass',
            overall_result: 'Passed',
            qc_date: new Date(Date.now() - (i * 21600000))
          });
        }
      }
    }

    console.log('✅ Seeding QC Checkpoints berhasil!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Gagal seeder QC:', error);
    process.exit(1);
  }
};

seedQC();
