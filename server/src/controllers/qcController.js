const { Op } = require('sequelize');
const { sequelize, QCCheckpoint, ServiceOrder, Device, Customer, Technician, User, RepairLog } = require('../models');

// Helper to generate QC Code
const generateQCCode = (num) => {
  return `QC-${new Date().getFullYear()}-${String(num).padStart(4, '0')}`;
};

// 1. Get Orders Pending QC Inspection (QC1 or QC2)
const getQCPendingQueue = async (req, res) => {
  try {
    const { type } = req.query; // 'qc1' or 'qc2'

    let statusFilter = ['QC1 Pending', 'QC2 Pending'];
    if (type === 'qc1') statusFilter = ['QC1 Pending'];
    if (type === 'qc2') statusFilter = ['QC2 Pending'];

    try { await sequelize.query("ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Intake';"); } catch (e) {}

    let orders = [];
    try {
      orders = await ServiceOrder.findAll({
        where: { status: statusFilter },
        include: [
          { model: Device, as: 'device' },
          { model: Customer, as: 'customer', attributes: ['id', 'customer_code', 'name'] },
          {
            model: Technician,
            as: 'assignedTechnician',
            include: [{ model: User, as: 'user', attributes: ['id', 'full_name'] }]
          },
          {
            model: QCCheckpoint,
            as: 'qcCheckpoints',
            include: [{ model: User, as: 'inspector', attributes: ['id', 'full_name', 'role'] }]
          }
        ],
        order: [['updated_at', 'DESC']]
      });
    } catch (dbErr) {
      const allOrders = await ServiceOrder.findAll({
        include: [
          { model: Device, as: 'device' },
          { model: Customer, as: 'customer', attributes: ['id', 'customer_code', 'name'] },
          {
            model: Technician,
            as: 'assignedTechnician',
            include: [{ model: User, as: 'user', attributes: ['id', 'full_name'] }]
          },
          {
            model: QCCheckpoint,
            as: 'qcCheckpoints',
            include: [{ model: User, as: 'inspector', attributes: ['id', 'full_name', 'role'] }]
          }
        ]
      });
      orders = allOrders.filter(o => statusFilter.includes(o.status));
    }

    return res.status(200).json({ success: true, data: orders });
  } catch (error) {
    console.error('getQCPendingQueue error:', error);
    return res.status(500).json({ success: false, message: 'Gagal mengambil antrean QC.', error: error.message });
  }
};

// Start QC1 Audit (Record QC1 Start Timestamp)
const startQC1 = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await ServiceOrder.findByPk(id);
    if (!order) return res.status(404).json({ success: false, message: 'Order tidak ditemukan.' });

    if (!order.qc1_started_at) {
      order.qc1_started_at = new Date();
      await order.save();
    }

    return res.status(200).json({ success: true, message: 'Timestamp Mulai Audit QC1 Arisa dicatat.', data: order });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Gagal mencatat timestamp mulai QC1.', error: error.message });
  }
};

// 2. Submit QC Checkpoint 1 (Arisa Hardware Inspection)
const submitQC1 = async (req, res) => {
  try {
    const { service_order_id, power_test, display_test, keyboard_test, storage_test, thermal_test, overall_result, failure_reason, rework_notes } = req.body;

    if (!service_order_id || !overall_result) {
      return res.status(400).json({ success: false, message: 'Harap tentukan Service Order ID dan Hasil Evaluasi (Passed/Rejected).' });
    }

    const order = await ServiceOrder.findByPk(service_order_id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Service Order tidak ditemukan.' });
    }

    // Record QC1 Start and Finish Timestamps
    if (!order.qc1_started_at) order.qc1_started_at = new Date();
    order.qc1_finished_at = new Date();

    const count = await QCCheckpoint.count();
    const qcCode = generateQCCode(count + 1);

    const checkpoint = await QCCheckpoint.create({
      qc_code: qcCode,
      service_order_id,
      checkpoint_type: 'Checkpoint 1',
      inspector_id: req.user ? req.user.id : 1,
      power_test: power_test || 'Pass',
      display_test: display_test || 'Pass',
      keyboard_test: keyboard_test || 'Pass',
      storage_test: storage_test || 'Pass',
      thermal_test: thermal_test || 'Pass',
      overall_result,
      failure_reason: overall_result === 'Rejected' ? failure_reason : null,
      rework_notes: rework_notes || null,
      qc_date: new Date()
    });

    if (overall_result === 'Passed') {
      order.status = 'QC2 Pending';
      await order.save();
    } else {
      order.status = 'Rework';
      await order.save();

      // Create/update SLA 48h deadline on active RepairLog
      const repairLog = await RepairLog.findOne({
        where: { service_order_id },
        order: [['created_at', 'DESC']]
      });

      if (repairLog) {
        repairLog.repair_status = 'Rework Required';
        repairLog.rework_sla_deadline = new Date(Date.now() + (48 * 3600000)); // +48 hours
        repairLog.rework_count = (repairLog.rework_count || 0) + 1;
        await repairLog.save();
      }
    }

    return res.status(201).json({
      success: true,
      message: `Audit QC1 Arisa '${qcCode}' berhasil disimpan! Status unit saat ini: '${order.status}'.`,
      data: { checkpoint, order }
    });
  } catch (error) {
    console.error('submitQC1 error:', error);
    return res.status(500).json({ success: false, message: 'Gagal memproses audit QC1.', error: error.message });
  }
};

// Start QC2 Audit (Record QC2 Start Timestamp)
const startQC2 = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await ServiceOrder.findByPk(id);
    if (!order) return res.status(404).json({ success: false, message: 'Order tidak ditemukan.' });

    if (!order.qc2_started_at) {
      order.qc2_started_at = new Date();
      await order.save();
    }

    return res.status(200).json({ success: true, message: 'Timestamp Mulai Audit QC2 Final dicatat.', data: order });
  } catch (error) {
    console.error('Error in startQC2Audit:', error);
    return res.status(500).json({ success: false, message: 'Gagal mencatat timestamp audit QC2.' });
  }
};

// 3. Submit QC Checkpoint 2 (Final Release Inspection)
const submitQC2Check = async (req, res) => {
  try {
    const { id } = req.params;
    const { results = {}, overall_result, failure_reason, rework_notes } = req.body;
    const inspector_id = req.user ? req.user.id : null;

    const order = await ServiceOrder.findByPk(id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Service Order tidak ditemukan.' });
    }

    const qcCode = generateQCCode();
    const passed = overall_result === 'Passed';
    const finishedAt = new Date();

    const checkpoint = await QCCheckpoint.create({
      service_order_id: order.id,
      checkpoint_type: 'qc2',
      qc_code: qcCode,
      inspector_id,
      passed,
      results,
      failure_reason: passed ? null : failure_reason,
      rework_notes: passed ? null : rework_notes,
      started_at: order.qc2_started_at || finishedAt,
      finished_at: finishedAt
    });

    if (passed) {
      order.status = 'Released';
      order.qc2_passed = true;
    } else {
      order.status = 'Rework';
      order.qc2_passed = false;
      order.rework_count = (order.rework_count || 0) + 1;
    }
    order.qc2_finished_at = finishedAt;
    await order.save();

    return res.status(200).json({
      success: true,
      message: `Audit QC2 Final '${qcCode}' berhasil disimpan! Status unit saat ini: '${order.status}'.`,
      inspector_id: req.user ? req.user.id : 1,
      functional_test: functional_test || 'Pass',
      physical_cosmetic_test: physical_cosmetic_test || 'Pass',
      os_firmware_test: os_firmware_test || 'Pass',
      overall_result,
      rework_notes: rework_notes || null,
      qc_date: new Date()
    });

    if (overall_result === 'Passed') {
      order.status = 'Released';
      order.released_date = new Date();
      await order.save();
    } else {
      order.status = 'Rework';
      await order.save();

      const repairLog = await RepairLog.findOne({
        where: { service_order_id },
        order: [['created_at', 'DESC']]
      });

      if (repairLog) {
        repairLog.repair_status = 'Rework Required';
        repairLog.rework_sla_deadline = new Date(Date.now() + (48 * 3600000));
        repairLog.rework_count = (repairLog.rework_count || 0) + 1;
        await repairLog.save();
      }
    }

    return res.status(201).json({
      success: true,
      message: `Audit QC2 Shopee '${qcCode}' berhasil disimpan! Status unit saat ini: '${order.status}'.`,
      data: { checkpoint, order }
    });
  } catch (error) {
    console.error('submitQC2 error:', error);
    return res.status(500).json({ success: false, message: 'Gagal memproses audit QC2.', error: error.message });
  }
};

// 4. Get QC Audit History
const getQCHistory = async (req, res) => {
  try {
    const checkpoints = await QCCheckpoint.findAll({
      include: [
        {
          model: ServiceOrder,
          as: 'serviceOrder',
          include: [{ model: Device, as: 'device' }, { model: Customer, as: 'customer' }]
        },
        { model: User, as: 'inspector', attributes: ['id', 'full_name', 'role'] }
      ],
      order: [['created_at', 'DESC']]
    });

    return res.status(200).json({ success: true, data: checkpoints });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Gagal mengambil riwayat audit QC.', error: error.message });
  }
};

// 5. Get QC Analytics & Pass Rate Metrics
const getQCMetrics = async (req, res) => {
  try {
    const allQC = await QCCheckpoint.findAll();

    const totalQC1 = allQC.filter(q => q.checkpoint_type === 'Checkpoint 1').length;
    const passedQC1 = allQC.filter(q => q.checkpoint_type === 'Checkpoint 1' && q.overall_result === 'Passed').length;
    const qc1PassRate = totalQC1 > 0 ? ((passedQC1 / totalQC1) * 100).toFixed(1) : '100.0';

    const totalQC2 = allQC.filter(q => q.checkpoint_type === 'Checkpoint 2').length;
    const passedQC2 = allQC.filter(q => q.checkpoint_type === 'Checkpoint 2' && q.overall_result === 'Passed').length;
    const qc2PassRate = totalQC2 > 0 ? ((passedQC2 / totalQC2) * 100).toFixed(1) : '100.0';

    const overallTotal = allQC.length;
    const overallPassed = allQC.filter(q => q.overall_result === 'Passed').length;
    const overallPassRate = overallTotal > 0 ? ((overallPassed / overallTotal) * 100).toFixed(1) : '100.0';

    const totalRejected = allQC.filter(q => q.overall_result === 'Rejected').length;

    return res.status(200).json({
      success: true,
      data: {
        totalQC1,
        passedQC1,
        qc1PassRate,
        totalQC2,
        passedQC2,
        qc2PassRate,
        overallTotal,
        overallPassed,
        overallPassRate,
        totalRejected
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Gagal mengambil metrik QC.', error: error.message });
  }
};

module.exports = {
  getQCPendingQueue,
  startQC1,
  submitQC1,
  startQC2,
  submitQC2,
  getQCHistory,
  getQCMetrics
};
