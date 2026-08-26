const { Op } = require('sequelize');
const { sequelize, Device, ServiceOrder, Customer, Technician, User, Branch } = require('../models');

// Helper to generate padded code
const generateCode = (prefix, num) => {
  return `${prefix}-${new Date().getFullYear()}-${String(num).padStart(4, '0')}`;
};

// 1. Get Customers List
const getCustomers = async (req, res) => {
  try {
    const customers = await Customer.findAll({ order: [['name', 'ASC']] });
    return res.status(200).json({ success: true, data: customers });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Gagal mengambil data customer.', error: error.message });
  }
};

// 1b. Create New Customer
const createCustomer = async (req, res) => {
  try {
    const { name, phone, contact_email, email, whatsapp_number } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({ success: false, message: 'Nama customer/klien wajib diisi.' });
    }

    const count = await Customer.count();
    const customer_code = `CUST-${String(count + 1).padStart(4, '0')}`;

    const newCustomer = await Customer.create({
      customer_code,
      name: name.trim(),
      phone: (phone || whatsapp_number || '').trim(),
      contact_email: (contact_email || email || '').trim()
    });

    return res.status(201).json({
      success: true,
      message: `Customer/Klien '${newCustomer.name}' berhasil ditambahkan.`,
      data: newCustomer
    });
  } catch (error) {
    console.error('Error in createCustomer:', error);
    return res.status(500).json({ success: false, message: 'Gagal menambahkan customer baru.', error: error.message });
  }
};

// 2. Get Service Orders (With Filters & Branch Subsetting)
const getServiceOrders = async (req, res) => {
  try {
    const { status, asset_type, search, customer_id, branch_id } = req.query;

    let whereClause = {};
    if (status) whereClause.status = status;
    if (customer_id) whereClause.customer_id = customer_id;
    if (branch_id) whereClause.branch_id = branch_id;

    let deviceWhere = {};
    if (asset_type) deviceWhere.asset_type = asset_type;

    if (search) {
      const searchTerms = { [Op.like]: `%${search}%` };
      whereClause[Op.or] = [
        { service_id: searchTerms },
        { '$device.serial_number$': searchTerms },
        { '$device.device_id$': searchTerms },
        { '$device.brand$': searchTerms },
        { '$device.model$': searchTerms }
      ];
    }

    try {
      // 1. Sync by service_order_id
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
      // 2. Sync by device_id
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
    } catch (e) {
      console.warn('BAST status sync warning:', e.message);
    }

    const orders = await ServiceOrder.findAll({
      where: whereClause,
      include: [
        {
          model: Device,
          as: 'device',
          where: Object.keys(deviceWhere).length > 0 ? deviceWhere : undefined
        },
        { model: Customer, as: 'customer', attributes: ['id', 'customer_code', 'name'] },
        { model: Branch, as: 'branch', attributes: ['id', 'name', 'code', 'address'] },
        {
          model: Technician,
          as: 'assignedTechnician',
          include: [{ model: User, as: 'user', attributes: ['id', 'full_name'] }]
        },
        { model: User, as: 'receivedBy', attributes: ['id', 'full_name'] }
      ],
      order: [['created_at', 'DESC']]
    });

    // Calculate Summary Stats
    const totalCount = orders.length;
    const intakeCount = orders.filter(o => o.status === 'Intake').length;
    const inRepairCount = orders.filter(o => o.status === 'In Repair').length;
    const qcPendingCount = orders.filter(o => o.status === 'QC1 Pending' || o.status === 'QC2 Pending').length;
    const releasedCount = orders.filter(o => o.status === 'Released').length;

    // Fetch all BAST documents (bast_type = '1') to compute bast_status dynamically in JS memory
    let basts = [];
    try {
      const { BastDocument, BastItem } = require('../models');
      basts = await BastDocument.findAll({
        where: { bast_type: '1' },
        include: [{ model: BastItem, as: 'items' }],
        order: [['created_at', 'DESC']]
      });
    } catch (e) {}

    const formattedOrders = orders.map(order => {
      const plainOrder = order.get({ plain: true });

      // Match order against BAST documents
      let matchingBast = null;

      // 1. Direct match by service_order_id or device_id in bast_items
      for (const b of basts) {
        const itemMatch = (b.items || []).find(
          i => (i.service_order_id && String(i.service_order_id) === String(order.id)) ||
               (i.device_id && String(i.device_id) === String(order.device_id))
        );
        if (itemMatch) {
          matchingBast = b;
          break;
        }
      }

      // 2. Fallback match by intake_date
      if (!matchingBast && basts.length > 0) {
        const orderDateStr = order.intake_date 
          ? new Date(order.intake_date).toISOString().slice(0, 10) 
          : new Date(order.created_at).toISOString().slice(0, 10);
        
        matchingBast = basts.find(b => b.intake_date === orderDateStr);
      }

      if (matchingBast) {
        plainOrder.bast_status = matchingBast.status;
      } else if (!plainOrder.bast_status) {
        plainOrder.bast_status = 'Pending_BAST';
      }

      return plainOrder;
    });

    return res.status(200).json({
      success: true,
      stats: {
        totalCount,
        intakeCount,
        inRepairCount,
        qcPendingCount,
        releasedCount
      },
      data: formattedOrders
    });
  } catch (error) {
    console.error('getServiceOrders error:', error);
    return res.status(500).json({ success: false, message: 'Gagal mengambil daftar service order.', error: error.message });
  }
};

// 3. Get Single Service Order Detail
const getServiceOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await ServiceOrder.findByPk(id, {
      include: [
        { model: Device, as: 'device' },
        { model: Customer, as: 'customer' },
        { model: Branch, as: 'branch' },
        {
          model: Technician,
          as: 'assignedTechnician',
          include: [{ model: User, as: 'user', attributes: ['id', 'full_name', 'email'] }]
        },
        { model: User, as: 'receivedBy', attributes: ['id', 'full_name'] }
      ]
    });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Service Order tidak ditemukan.' });
    }

    const plainOrder = order.get({ plain: true });

    try {
      const { BastDocument, BastItem } = require('../models');
      const basts = await BastDocument.findAll({
        where: { bast_type: '1' },
        include: [{ model: BastItem, as: 'items' }],
        order: [['created_at', 'DESC']]
      });

      let matchingBast = null;
      for (const b of basts) {
        const itemMatch = (b.items || []).find(
          i => (i.service_order_id && String(i.service_order_id) === String(order.id)) ||
               (i.device_id && String(i.device_id) === String(order.device_id))
        );
        if (itemMatch) {
          matchingBast = b;
          break;
        }
      }

      if (!matchingBast && basts.length > 0) {
        const orderDateStr = order.intake_date 
          ? new Date(order.intake_date).toISOString().slice(0, 10) 
          : new Date(order.created_at).toISOString().slice(0, 10);
        
        matchingBast = basts.find(b => b.intake_date === orderDateStr);
      }

      if (matchingBast) {
        plainOrder.bast_status = matchingBast.status;
      } else if (!plainOrder.bast_status) {
        plainOrder.bast_status = 'Pending_BAST';
      }
    } catch (e) {}

    return res.status(200).json({ success: true, data: plainOrder });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Gagal mengambil detail service order.', error: error.message });
  }
};

// 4. Create New Intake (Register Device & Service Order with Branch Code Prefix)
const createIntake = async (req, res) => {
  try {
    const {
      customer_id,
      branch_id,
      serial_number,
      brand,
      model,
      asset_type,
      fault_description,
      assigned_technician_id,
      notes
    } = req.body;

    if (!customer_id || !serial_number || !brand || !model || !asset_type || !fault_description) {
      return res.status(400).json({
        success: false,
        message: 'Mohon lengkapi semua field wajib (Customer, Serial Number, Brand, Model, Tipe Asset, dan Deskripsi Kerusakan).'
      });
    }

    // Determine Branch & Prefix Code
    let branchPrefix = 'SVC';
    let targetBranchId = null;

    if (branch_id) {
      const branch = await Branch.findByPk(branch_id);
      if (branch) {
        branchPrefix = branch.code.toUpperCase();
        targetBranchId = branch.id;
      }
    } else {
      // Default to first active branch if available
      const defaultBranch = await Branch.findOne({ where: { is_active: true }, order: [['id', 'ASC']] });
      if (defaultBranch) {
        branchPrefix = defaultBranch.code.toUpperCase();
        targetBranchId = defaultBranch.id;
      }
    }

    // Ensure PostgreSQL table schema is up to date before processing intake
    try { await sequelize.query("ALTER TABLE devices ADD COLUMN IF NOT EXISTS asset_type VARCHAR(100) DEFAULT 'Type A';"); } catch (e) { global.lastAlterErr = 'd1: ' + e.message; }
    try { await sequelize.query('ALTER TABLE "devices" ADD COLUMN IF NOT EXISTS "asset_type" VARCHAR(100) DEFAULT \'Type A\';'); } catch (e) { global.lastAlterErr += ' | d2: ' + e.message; }
    try { await sequelize.query("ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS bast_status VARCHAR(50) DEFAULT 'Pending_BAST';"); } catch (e) {}
    try { await sequelize.query('ALTER TABLE "service_orders" ADD COLUMN IF NOT EXISTS "bast_status" VARCHAR(50) DEFAULT \'Pending_BAST\';'); } catch (e) {}
    try { await sequelize.query("ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS sea_approval_decision VARCHAR(50);"); } catch (e) {}

    // Check if Device already exists by Serial Number (with fail-safe fallback if column missing)
    let device = null;
    try {
      device = await Device.findOne({ where: { serial_number: serial_number.trim() } });
    } catch (err) {
      try {
        device = await Device.findOne({
          where: { serial_number: serial_number.trim() },
          attributes: ['id', 'device_id', 'serial_number', 'brand', 'model', 'customer_id']
        });
      } catch (e2) {
        device = null;
      }
    }

    let cleanAssetType = 'Type A';
    if (asset_type) {
      const s = String(asset_type).trim();
      if (s.startsWith('Type A')) cleanAssetType = 'Type A';
      else if (s.startsWith('Type B')) cleanAssetType = 'Type B';
      else if (s.startsWith('Type C')) cleanAssetType = 'Type C';
      else if (s.startsWith('Type D')) cleanAssetType = 'Type D';
      else if (s.startsWith('Type E')) cleanAssetType = 'Type E';
      else if (s.startsWith('Type F')) cleanAssetType = 'Type F';
      else cleanAssetType = s;
    }

    if (!device) {
      // Create new Device Master
      const deviceCount = await Device.count().catch(() => 0);
      const generatedDeviceId = generateCode('DEV', deviceCount + 1);

      try {
        device = await Device.create({
          device_id: generatedDeviceId,
          serial_number: serial_number.trim(),
          brand: brand.trim(),
          model: model.trim(),
          asset_type: cleanAssetType,
          customer_id
        });
      } catch (createErr) {
        device = await Device.create({
          device_id: generatedDeviceId,
          serial_number: serial_number.trim(),
          brand: brand.trim(),
          model: model.trim(),
          customer_id
        }, { fields: ['device_id', 'serial_number', 'brand', 'model', 'customer_id'] });
      }
    } else {
      device.brand = brand.trim();
      device.model = model.trim();
      try {
        device.asset_type = cleanAssetType;
        await device.save();
      } catch (e) {
        // Continue if asset_type column not present yet
      }
    }

    // Count order sequence for this specific branch
    const branchOrderCount = await ServiceOrder.count({
      where: targetBranchId ? { branch_id: targetBranchId } : {}
    }).catch(() => 0);
    const generatedServiceId = generateCode(branchPrefix, branchOrderCount + 1);

    const serviceOrder = await ServiceOrder.create({
      service_id: generatedServiceId,
      device_id: device.id,
      customer_id,
      branch_id: targetBranchId,
      fault_description,
      status: 'Intake',
      assigned_technician_id: null,
      assigned_tech_at: null,
      received_by_user_id: req.user ? req.user.id : null,
      intake_date: new Date(),
      notes: notes || null
    });

    let fullOrder = null;
    try {
      fullOrder = await ServiceOrder.findByPk(serviceOrder.id, {
        include: [
          { model: Device, as: 'device' },
          { model: Customer, as: 'customer' },
          { model: Branch, as: 'branch' },
          {
            model: Technician,
            as: 'assignedTechnician',
            include: [{ model: User, as: 'user', attributes: ['id', 'full_name'] }]
          }
        ]
      });
    } catch (e) {
      fullOrder = {
        id: serviceOrder.id,
        service_id: generatedServiceId,
        device_id: device.id,
        customer_id,
        status: 'Intake',
        fault_description,
        device,
        intake_date: serviceOrder.intake_date
      };
    }

    return res.status(201).json({
      success: true,
      message: `Intake berhasil! Order Service '${generatedServiceId}' [Cabang ${branchPrefix}] & Device '${device.device_id}' telah terdaftar.`,
      data: fullOrder
    });
  } catch (error) {
    console.error('createIntake error:', error);
    return res.status(500).json({ success: false, message: 'Gagal memproses pendaftaran intake.', error: error.message + (global.lastAlterErr ? ' | ALTER_LOG: ' + global.lastAlterErr : '') });
  }
};

// 5. Update Service Order (Status, Assigned Technician, Notes, & Device Master Details)
const updateServiceOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      status,
      assigned_technician_id,
      notes,
      branch_id,
      customer_id,
      fault_description,
      serial_number,
      brand,
      model,
      asset_type
    } = req.body;

    const order = await ServiceOrder.findByPk(id, {
      include: [{ model: Device, as: 'device' }]
    });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Service order tidak ditemukan.' });
    }

    if (status) {
      order.status = status;
      if (status === 'Released') {
        order.released_date = new Date();
      }
    }

    // Helper check if order belongs to an Approved BAST document
    let isBastApproved = order.bast_status === 'Approved_SEA' || order.bast_status === 'Verified_By_SEA';
    if (!isBastApproved) {
      try {
        const { BastDocument, BastItem } = require('../models');
        const basts = await BastDocument.findAll({
          where: { bast_type: '1', status: 'Approved_SEA' },
          include: [{ model: BastItem, as: 'items' }]
        });

        for (const b of basts) {
          const itemMatch = (b.items || []).find(
            i => (i.service_order_id && String(i.service_order_id) === String(order.id)) ||
                 (i.device_id && String(i.device_id) === String(order.device_id))
          );
          if (itemMatch) {
            isBastApproved = true;
            break;
          }
          const orderDateStr = order.intake_date 
            ? new Date(order.intake_date).toISOString().slice(0, 10) 
            : new Date(order.created_at).toISOString().slice(0, 10);
          if (b.intake_date === orderDateStr) {
            isBastApproved = true;
            break;
          }
        }
      } catch (e) {}
    }

    if (isBastApproved) {
      order.bast_status = 'Approved_SEA';
    }

    if (assigned_technician_id !== undefined && assigned_technician_id !== null && assigned_technician_id !== '') {
      // Check BAST approval status before physical distribution to technician
      if (!isBastApproved && (!req.user || (req.user.role !== 'Admin' && req.user.role !== 'Coordinator'))) {
        return res.status(400).json({
          success: false,
          message: 'Distribusi unit ke teknisi terkunci: Dokumen BAST belum disetujui oleh QC SEA. Mohon selesaikan verifikasi BAST terlebih dahulu.'
        });
      }

      let targetTechId = parseInt(assigned_technician_id);
      let techObj = await Technician.findByPk(targetTechId);
      if (!techObj) {
        techObj = await Technician.findOne({ where: { user_id: targetTechId } });
      }
      if (!techObj) {
        const targetUser = await User.findByPk(targetTechId);
        if (targetUser) {
          techObj = await Technician.create({
            user_id: targetUser.id,
            full_name: targetUser.full_name,
            employee_code: `TECH-${String(targetUser.id).padStart(3, '0')}`,
            is_active: true
          }).catch(() => null);
        }
      }

      const finalTechId = techObj ? techObj.id : targetTechId;
      order.assigned_technician_id = finalTechId;
      if (finalTechId && !order.assigned_tech_at) {
        order.assigned_tech_at = new Date();
      }
    } else if (assigned_technician_id === null || assigned_technician_id === '') {
      order.assigned_technician_id = null;
    }

    if (branch_id !== undefined) {
      order.branch_id = branch_id ? parseInt(branch_id) : null;
    }

    if (customer_id !== undefined) {
      order.customer_id = customer_id ? parseInt(customer_id) : null;
    }

    if (fault_description !== undefined) {
      order.fault_description = fault_description.trim();
    }

    if (notes !== undefined) {
      order.notes = notes;
    }

    await order.save();

    // Update associated Device Master details if provided
    if (order.device) {
      let deviceChanged = false;
      if (serial_number !== undefined && serial_number.trim()) {
        order.device.serial_number = serial_number.trim();
        deviceChanged = true;
      }
      if (brand !== undefined && brand.trim()) {
        order.device.brand = brand.trim();
        deviceChanged = true;
      }
      if (model !== undefined && model.trim()) {
        order.device.model = model.trim();
        deviceChanged = true;
      }
      if (asset_type !== undefined && asset_type) {
        order.device.asset_type = asset_type;
        deviceChanged = true;
      }
      if (customer_id !== undefined && customer_id) {
        order.device.customer_id = parseInt(customer_id);
        deviceChanged = true;
      }

      if (deviceChanged) {
        try {
          await order.device.save();
        } catch (devErr) {
          console.warn('Device save warning (asset_type fallback):', devErr.message);
          try {
            await order.device.save({ fields: ['serial_number', 'brand', 'model', 'customer_id'] });
          } catch (e) {}
        }
      }
    }

    const updatedOrder = await ServiceOrder.findByPk(id, {
      include: [
        { model: Device, as: 'device' },
        { model: Customer, as: 'customer' },
        { model: Branch, as: 'branch' },
        {
          model: Technician,
          as: 'assignedTechnician',
          include: [{ model: User, as: 'user', attributes: ['id', 'full_name'] }]
        }
      ]
    });

    return res.status(200).json({
      success: true,
      message: `Data Service Order '${order.service_id}' dan Master Device berhasil diperbarui.`,
      data: updatedOrder
    });
  } catch (error) {
    console.error('Error in updateServiceOrder:', error);
    return res.status(500).json({ success: false, message: 'Gagal memperbarui service order.', error: error.message });
  }
};

// 6. Get All Master Devices
const getDevices = async (req, res) => {
  try {
    const devices = await Device.findAll({
      include: [
        { model: Customer, as: 'customer' },
        { model: ServiceOrder, as: 'serviceOrders', include: [{ model: Branch, as: 'branch' }] }
      ],
      order: [['created_at', 'DESC']]
    });

    return res.status(200).json({ success: true, data: devices });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Gagal mengambil data master perangkat.', error: error.message });
  }
};

// 7. Get Real Dashboard Stats from Database
const getDashboardStats = async (req, res) => {
  try {
    let orderWhere = {};
    if (req.user && req.user.role === 'Technician') {
      let tech = await Technician.findOne({ where: { user_id: req.user.id } });
      const validTechIds = new Set([req.user.id]);
      if (tech) validTechIds.add(tech.id);

      const techsByUserId = await Technician.findAll({
        where: { [Op.or]: [{ user_id: req.user.id }, { id: req.user.id }] }
      });
      techsByUserId.forEach(t => {
        validTechIds.add(t.id);
        if (t.user_id) validTechIds.add(t.user_id);
      });

      if (req.user.full_name) {
        const techsByName = await Technician.findAll({
          where: { full_name: req.user.full_name }
        });
        techsByName.forEach(t => {
          validTechIds.add(t.id);
          if (t.user_id) validTechIds.add(t.user_id);
        });
      }

      const idArray = Array.from(validTechIds).map(id => parseInt(id)).filter(Boolean);
      orderWhere.assigned_technician_id = { [Op.in]: idArray };
    }

    const totalDevices = await Device.count();
    const activeInRepair = await ServiceOrder.count({
      where: {
        ...orderWhere,
        status: {
          [Op.in]: ['Intake', 'In Repair', 'Rework', 'QC1 Pending', 'QC2 Pending']
        }
      }
    });

    const totalOrders = await ServiceOrder.count({ where: orderWhere });
    const releasedOrders = await ServiceOrder.count({
      where: { ...orderWhere, status: 'Released' }
    });

    // QC Pass rate calculation from QCCheckpoint
    let qcPassRate = '0.0%';
    try {
      const { QCCheckpoint } = require('../models');
      if (QCCheckpoint) {
        const totalQC = await QCCheckpoint.count();
        const passedQC = await QCCheckpoint.count({ where: { overall_result: 'Passed' } });
        if (totalQC > 0) {
          qcPassRate = `${((passedQC / totalQC) * 100).toFixed(1)}%`;
        }
      }
    } catch (e) {}

    // Recent 5 Service Orders from real DB
    const recentOrders = await ServiceOrder.findAll({
      where: orderWhere,
      limit: 10,
      order: [['created_at', 'DESC']],
      include: [
        { model: Device, as: 'device' },
        { model: Customer, as: 'customer' },
        { model: Branch, as: 'branch' },
        {
          model: Technician,
          as: 'assignedTechnician',
          include: [{ model: User, as: 'user', attributes: ['id', 'full_name'] }]
        }
      ]
    });

    // Find latest Rework order for SLA timer card if any
    const reworkOrder = await ServiceOrder.findOne({
      where: { ...orderWhere, status: 'Rework' },
      include: [
        { model: Device, as: 'device' }
      ],
      order: [['updated_at', 'DESC']]
    });

    return res.status(200).json({
      success: true,
      data: {
        totalDevices,
        activeInRepair,
        qcPassRate,
        releasedOrders,
        totalOrders,
        recentOrders,
        reworkOrder
      }
    });
  } catch (error) {
    console.error('Error in getDashboardStats:', error);
    return res.status(500).json({ success: false, message: 'Gagal mengambil statistik dashboard.', error: error.message });
  }
};

module.exports = {
  getCustomers,
  createCustomer,
  getServiceOrders,
  getServiceOrderById,
  createIntake,
  updateServiceOrder,
  getDevices,
  getDashboardStats
};
