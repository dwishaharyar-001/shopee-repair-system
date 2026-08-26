const { Op } = require('sequelize');
const { ServiceOrder, Device, Customer, Technician, User, RepairLog, Part, PartConsumed, BrokenPart, QCCheckpoint } = require('../models');

// Helper generator for repair log code
const generateRepairCode = (num) => {
  return `REP-${new Date().getFullYear()}-${String(num).padStart(4, '0')}`;
};

// 1. Get Technician Work Queue
const getWorkQueue = async (req, res) => {
  try {
    const { status, technician_id } = req.query;

    let whereClause = {};
    if (status) {
      whereClause.status = status;
    }

    // Role-based strict isolation: Technician only sees own assigned devices; Coordinator/Admin see ALL
    if (req.user && req.user.role === 'Technician') {
      let tech = await Technician.findOne({ where: { user_id: req.user.id } }).catch(() => null);
      if (!tech) {
        tech = await Technician.create({
          user_id: req.user.id,
          full_name: req.user.full_name || 'Technician',
          employee_code: `TECH-${String(req.user.id).padStart(3, '0')}`,
          is_active: true
        }).catch(() => null);
      }

      const validTechIds = new Set([req.user.id]);
      if (tech) validTechIds.add(tech.id);

      try {
        const techsByUserId = await Technician.findAll({
          where: { [Op.or]: [{ user_id: req.user.id }, { id: req.user.id }] }
        });
        techsByUserId.forEach(t => {
          validTechIds.add(t.id);
          if (t.user_id) validTechIds.add(t.user_id);
        });
      } catch (e) {}

      if (req.user.full_name) {
        try {
          const techsByName = await Technician.findAll({
            where: { full_name: req.user.full_name }
          });
          techsByName.forEach(t => {
            validTechIds.add(t.id);
            if (t.user_id) validTechIds.add(t.user_id);
          });
        } catch (e) {}
      }

      const idArray = Array.from(validTechIds).map(id => parseInt(id)).filter(id => !isNaN(id));
      if (idArray.length > 0) {
        whereClause.assigned_technician_id = { [Op.in]: idArray };
      }
    } else if (technician_id) {
      const parsedTechId = parseInt(technician_id);
      if (!isNaN(parsedTechId)) {
        const techObj = await Technician.findByPk(parsedTechId).catch(() => null);
        const validTechIds = new Set([parsedTechId]);
        if (techObj) {
          validTechIds.add(techObj.id);
          if (techObj.user_id) validTechIds.add(techObj.user_id);
        }
        whereClause.assigned_technician_id = { [Op.in]: Array.from(validTechIds) };
      }
    }

    let orders = [];
    try {
      orders = await ServiceOrder.findAll({
        where: whereClause,
        include: [
          { model: Device, as: 'device' },
          { model: Customer, as: 'customer', attributes: ['id', 'customer_code', 'name'] },
          { model: Branch, as: 'branch', attributes: ['id', 'name', 'code', 'address'] },
          {
            model: Technician,
            as: 'assignedTechnician',
            include: [{ model: User, as: 'user', attributes: ['id', 'full_name'] }]
          }
        ],
        order: [['created_at', 'DESC']]
      });
    } catch (e) {
      console.error('ServiceOrder.findAll error in getWorkQueue:', e.message);
      orders = await ServiceOrder.findAll({
        include: [
          { model: Device, as: 'device' },
          { model: Customer, as: 'customer' }
        ],
        order: [['created_at', 'DESC']]
      }).catch(() => []);
    }

    const activeOrders = status ? orders : orders.filter(o => o.status !== 'Released');

    const formattedOrders = await Promise.all(
      activeOrders.map(async (order) => {
        let plainOrder = {};
        try {
          plainOrder = order.get ? order.get({ plain: true }) : { ...order };
        } catch (e) {
          plainOrder = { ...order };
        }

        // Populate assignedTechnician safely if missing
        if (!plainOrder.assignedTechnician && plainOrder.assigned_technician_id) {
          const targetId = parseInt(plainOrder.assigned_technician_id);
          if (!isNaN(targetId)) {
            try {
              let tech = await Technician.findOne({
                where: { [Op.or]: [{ id: targetId }, { user_id: targetId }] },
                include: [{ model: User, as: 'user', attributes: ['id', 'full_name'] }]
              });
              if (tech) {
                plainOrder.assignedTechnician = tech.get ? tech.get({ plain: true }) : tech;
              }
            } catch (e) {}
          }
        }

        try {
          plainOrder.repairLogs = await RepairLog.findAll({
            where: { service_order_id: plainOrder.id },
            order: [['id', 'DESC']]
          });
        } catch (e) {
          plainOrder.repairLogs = [];
        }

        try {
          plainOrder.consumedParts = await PartConsumed.findAll({
            where: { service_order_id: plainOrder.id },
            include: [{ model: Part, as: 'part', attributes: ['id', 'part_number', 'name', 'unit_cost'] }]
          });
        } catch (e) {
          plainOrder.consumedParts = [];
        }

        try {
          plainOrder.brokenParts = await BrokenPart.findAll({
            where: { service_order_id: plainOrder.id },
            include: [{ model: User, as: 'reportedBy', attributes: ['id', 'full_name'] }]
          });
        } catch (e) {
          plainOrder.brokenParts = [];
        }

        try {
          plainOrder.qcCheckpoints = await QCCheckpoint.findAll({
            where: { service_order_id: plainOrder.id },
            include: [{ model: User, as: 'inspector', attributes: ['id', 'full_name', 'role', 'qc_affiliation'] }]
          });
        } catch (e) {
          plainOrder.qcCheckpoints = [];
        }

        if ((plainOrder.status === 'Intake' || !plainOrder.status) && (plainOrder.assigned_technician_id || plainOrder.assignedTechnician)) {
          plainOrder.status = 'Teknisi Assigned';
        }

        return plainOrder;
      })
    );

    return res.status(200).json({
      success: true,
      data: formattedOrders
    });
  } catch (error) {
    console.error('getWorkQueue error:', error);
    return res.status(500).json({ success: false, message: 'Gagal mengambil antrean work queue perbaikan.', error: error.message });
  }
};

// 2. Start Repair Timer
const startTimer = async (req, res) => {
  try {
    const { id } = req.params; // service_order_id

    const order = await ServiceOrder.findByPk(id, {
      include: [{ model: Technician, as: 'assignedTechnician' }]
    });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Service Order tidak ditemukan.' });
    }

    // Ensure logged in user has technician profile or use assigned tech
    let techId = order.assigned_technician_id;
    if (req.user && req.user.technicianProfile) {
      techId = req.user.technicianProfile.id;
    }

    if (!techId) {
      return res.status(400).json({
        success: false,
        message: 'Order perbaikan belum memiliki teknisi terdaftar. Harap tugaskan teknisi terlebih dahulu.'
      });
    }

    // Update order status to 'In Repair'
    order.status = 'In Repair';
    order.assigned_technician_id = techId;
    if (!order.assigned_tech_at) order.assigned_tech_at = new Date();
    if (!order.repair_started_at) order.repair_started_at = new Date();
    await order.save();

    // Find latest log or create new log
    let activeLog = await RepairLog.findOne({
      where: { service_order_id: id },
      order: [['id', 'DESC']]
    });

    if (activeLog && activeLog.repair_status !== 'Completed') {
      activeLog.repair_status = 'In Progress';
      activeLog.start_time = new Date();
      await activeLog.save();
    } else {
      const logCount = await RepairLog.count();
      activeLog = await RepairLog.create({
        repair_code: generateRepairCode(logCount + 1),
        service_order_id: id,
        technician_id: techId,
        start_time: new Date(),
        repair_status: 'In Progress'
      });
    }

    return res.status(200).json({
      success: true,
      message: `Timer perbaikan untuk '${order.service_id}' berhasil DIMULAI.`,
      data: { order, activeLog }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Gagal memulai timer perbaikan.', error: error.message });
  }
};

// 3. Save Diagnostics, Fault Description & Repair Categories
const saveDiagnostics = async (req, res) => {
  try {
    const { id } = req.params; // service_order_id
    const { diagnostics_outcome, repair_categories, action_taken, fault_description } = req.body;

    let activeLog = await RepairLog.findOne({
      where: { service_order_id: id },
      order: [['created_at', 'DESC']]
    });

    if (!activeLog) {
      const orderObj = await ServiceOrder.findByPk(id);
      let resolvedTechId = orderObj ? orderObj.assigned_technician_id : null;
      if (!resolvedTechId && req.user && req.user.technicianProfile) {
        resolvedTechId = req.user.technicianProfile.id;
      }
      if (!resolvedTechId) {
        const firstTech = await Technician.findOne();
        resolvedTechId = firstTech ? firstTech.id : null;
      }

      const logCount = await RepairLog.count();
      activeLog = await RepairLog.create({
        repair_code: generateRepairCode(logCount + 1),
        service_order_id: id,
        technician_id: resolvedTechId,
        repair_status: 'In Progress'
      });
    }

    if (diagnostics_outcome !== undefined) activeLog.diagnostics_outcome = diagnostics_outcome;
    if (repair_categories !== undefined) {
      activeLog.repair_categories = typeof repair_categories === 'string' ? repair_categories : JSON.stringify(repair_categories);
    }
    if (action_taken !== undefined) activeLog.action_taken = action_taken;

    await activeLog.save();

    if (fault_description !== undefined) {
      const order = await ServiceOrder.findByPk(id);
      if (order) {
        order.fault_description = fault_description;
        await order.save();
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Informasi data perbaikan berhasil disimpan.',
      data: activeLog
    });
  } catch (error) {
    console.error('Error in saveDiagnostics:', error);
    return res.status(500).json({ success: false, message: 'Gagal menyimpan data perbaikan.', error: error.message });
  }
};

// 3b. Stop / Pause Repair Timer
const stopTimer = async (req, res) => {
  try {
    const { id } = req.params;
    const { action_taken, diagnostics_outcome, repair_categories } = req.body;

    const order = await ServiceOrder.findByPk(id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Service order tidak ditemukan.' });
    }

    const activeLog = await RepairLog.findOne({
      where: {
        service_order_id: id,
        repair_status: 'In Progress'
      }
    });

    if (!activeLog) {
      return res.status(400).json({ success: false, message: 'Tidak ada timer aktif yang sedang berjalan untuk unit ini.' });
    }

    const endTime = new Date();
    activeLog.end_time = endTime;
    if (action_taken !== undefined) activeLog.action_taken = action_taken;
    if (diagnostics_outcome !== undefined) activeLog.diagnostics_outcome = diagnostics_outcome;
    if (repair_categories !== undefined) {
      activeLog.repair_categories = typeof repair_categories === 'string' ? repair_categories : JSON.stringify(repair_categories);
    }

    if (activeLog.start_time) {
      const diffMs = endTime - new Date(activeLog.start_time);
      const elapsedSecs = Math.max(0, Math.floor(diffMs / 1000));
      const currentStoredSecs = activeLog.duration_seconds || ((activeLog.duration_minutes || 0) * 60);
      const totalSecs = currentStoredSecs + elapsedSecs;

      activeLog.duration_seconds = totalSecs;
      activeLog.duration_minutes = Math.floor(totalSecs / 60);
    }

    activeLog.repair_status = 'Paused';
    await activeLog.save();

    const displayMinutes = Math.floor((activeLog.duration_seconds || 0) / 60);
    const displaySecs = (activeLog.duration_seconds || 0) % 60;

    return res.status(200).json({
      success: true,
      message: `Timer perbaikan '${order.service_id}' dihentikan. Total durasi: ${displayMinutes}m ${displaySecs}s.`,
      data: activeLog
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Gagal menghentikan timer perbaikan.', error: error.message });
  }
};

// 4. Request Spare Part
const requestPart = async (req, res) => {
  try {
    const { id } = req.params; // service_order_id
    const { part_id, quantity } = req.body;

    if (!part_id || !quantity || quantity <= 0) {
      return res.status(400).json({ success: false, message: 'Pilih part dan jumlah kuantitas yang valid.' });
    }

    const part = await Part.findByPk(part_id);
    if (!part) {
      return res.status(404).json({ success: false, message: 'Spare part tidak ditemukan di inventaris.' });
    }

    if (part.stock_quantity < quantity) {
      return res.status(400).json({
        success: false,
        message: `Stok tidak mencukupi! Stok '${part.name}' tersisa: ${part.stock_quantity} unit.`
      });
    }

    // Deduct stock
    part.stock_quantity -= parseInt(quantity);
    await part.save();

    // Find current repair log if any
    const activeLog = await RepairLog.findOne({
      where: { service_order_id: id, repair_status: 'In Progress' }
    });

    const unitCost = parseFloat(part.unit_cost) || 0;
    const totalCost = unitCost * parseInt(quantity);

    const partConsumed = await PartConsumed.create({
      service_order_id: id,
      repair_log_id: activeLog ? activeLog.id : null,
      part_id: part.id,
      quantity: parseInt(quantity),
      unit_cost: unitCost,
      total_cost: totalCost,
      requested_by_user_id: req.user ? req.user.id : null
    });

    return res.status(201).json({
      success: true,
      message: `Part '${part.name}' x${quantity} berhasil ditambahkan ke unit. Sisa stok: ${part.stock_quantity}.`,
      data: partConsumed
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Gagal memproses permintaan spare part.', error: error.message });
  }
};

// 4b. Remove / Delete Consumed Spare Part (Kurangi Spare Part)
const removePartConsumed = async (req, res) => {
  try {
    const { id, partConsumedId } = req.params;

    const partConsumed = await PartConsumed.findOne({
      where: { id: partConsumedId, service_order_id: id }
    });

    if (!partConsumed) {
      return res.status(404).json({ success: false, message: 'Data spare part yang digunakan tidak ditemukan.' });
    }

    // Restore stock to Part
    const part = await Part.findByPk(partConsumed.part_id);
    if (part) {
      part.stock_quantity += partConsumed.quantity;
      await part.save();
    }

    await partConsumed.destroy();

    return res.status(200).json({
      success: true,
      message: 'Spare part berhasil dikurangi/dibatalkan dan stok dikembalikan ke inventaris.'
    });
  } catch (error) {
    console.error('Error in removePartConsumed:', error);
    return res.status(500).json({ success: false, message: 'Gagal mengurangi spare part.', error: error.message });
  }
};

// 5. Submit Completed Repair to QC1 Arisa
const submitToQC1 = async (req, res) => {
  try {
    const { id } = req.params;
    const { action_taken } = req.body;

    const order = await ServiceOrder.findByPk(id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Service order tidak ditemukan.' });
    }

    // Update order status to QC1 Pending
    order.status = 'QC1 Pending';
    order.repair_finished_at = new Date();
    await order.save();

    // Mark active log as completed
    const activeLog = await RepairLog.findOne({
      where: { service_order_id: id, repair_status: ['In Progress', 'Paused'] },
      order: [['created_at', 'DESC']]
    });

    if (activeLog) {
      activeLog.repair_status = 'Completed';
      if (action_taken) activeLog.action_taken = action_taken;
      if (!activeLog.end_time) activeLog.end_time = new Date();
      await activeLog.save();
    }

    return res.status(200).json({
      success: true,
      message: `Perbaikan unit '${order.service_id}' SELESAI dan dikirimkan ke QC1 Arisa untuk verifikasi.`,
      data: order
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Gagal mengirimkan perbaikan ke QC1.', error: error.message });
  }
};

// 6. Get Spare Parts Catalog
const getPartsCatalog = async (req, res) => {
  try {
    const parts = await Part.findAll({ order: [['category', 'ASC'], ['name', 'ASC']] });
    return res.status(200).json({ success: true, data: parts });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Gagal mengambil katalog spare part.', error: error.message });
  }
};

// 7. Add Broken/Damaged Spare Part
const addBrokenPart = async (req, res) => {
  try {
    const { id } = req.params; // service_order_id
    const { category_name, serial_number, damage_reason } = req.body;

    if (!category_name || !damage_reason) {
      return res.status(400).json({
        success: false,
        message: 'Kategori spare part dan deskripsi alasan rusaknya wajib diisi.'
      });
    }

    const order = await ServiceOrder.findByPk(id, {
      include: [{ model: Device, as: 'device' }]
    });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Service order tidak ditemukan.' });
    }

    const brokenPart = await BrokenPart.create({
      service_order_id: order.id,
      device_id: order.device_id, // Linked to Asset ID
      category_name: category_name.trim(),
      serial_number: serial_number ? serial_number.trim() : null,
      damage_reason: damage_reason.trim(),
      reported_by_user_id: req.user ? req.user.id : null
    });

    const fullRecord = await BrokenPart.findByPk(brokenPart.id, {
      include: [{ model: User, as: 'reportedBy', attributes: ['id', 'full_name'] }]
    });

    return res.status(201).json({
      success: true,
      message: `Pencatatan spare part rusak '${category_name}' berhasil ditambahkan dan terhubung dengan Asset ID #${order.device?.device_id}.`,
      data: fullRecord
    });
  } catch (error) {
    console.error('Error in addBrokenPart:', error);
    return res.status(500).json({ success: false, message: 'Gagal mencatat spare part rusak.', error: error.message });
  }
};

// 8. Remove Broken Spare Part Record
const removeBrokenPart = async (req, res) => {
  try {
    const { brokenPartId } = req.params;

    const brokenPart = await BrokenPart.findByPk(brokenPartId);
    if (!brokenPart) {
      return res.status(404).json({ success: false, message: 'Catatan spare part rusak tidak ditemukan.' });
    }

    await brokenPart.destroy();

    return res.status(200).json({
      success: true,
      message: 'Catatan spare part rusak berhasil dihapus.'
    });
  } catch (error) {
    console.error('Error in removeBrokenPart:', error);
    return res.status(500).json({ success: false, message: 'Gagal menghapus catatan spare part rusak.', error: error.message });
  }
};

module.exports = {
  getWorkQueue,
  startTimer,
  saveDiagnostics,
  stopTimer,
  requestPart,
  removePartConsumed,
  submitToQC1,
  getPartsCatalog,
  addBrokenPart,
  removeBrokenPart
};
