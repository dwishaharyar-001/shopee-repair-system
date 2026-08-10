const { Op } = require('sequelize');
const { Device, ServiceOrder, Customer, Technician, User, Branch } = require('../models');

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

    return res.status(200).json({
      success: true,
      stats: {
        totalCount,
        intakeCount,
        inRepairCount,
        qcPendingCount,
        releasedCount
      },
      data: orders
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

    return res.status(200).json({ success: true, data: order });
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

    // Check if Device already exists by Serial Number
    let device = await Device.findOne({ where: { serial_number: serial_number.trim() } });

    if (!device) {
      // Create new Device Master
      const deviceCount = await Device.count();
      const generatedDeviceId = generateCode('DEV', deviceCount + 1);

      device = await Device.create({
        device_id: generatedDeviceId,
        serial_number: serial_number.trim(),
        brand: brand.trim(),
        model: model.trim(),
        asset_type,
        customer_id
      });
    }

    // Count order sequence for this specific branch
    const branchOrderCount = await ServiceOrder.count({
      where: targetBranchId ? { branch_id: targetBranchId } : {}
    });
    const generatedServiceId = generateCode(branchPrefix, branchOrderCount + 1);

    const serviceOrder = await ServiceOrder.create({
      service_id: generatedServiceId,
      device_id: device.id,
      customer_id,
      branch_id: targetBranchId,
      fault_description,
      status: 'Intake',
      assigned_technician_id: assigned_technician_id || null,
      assigned_tech_at: assigned_technician_id ? new Date() : null,
      received_by_user_id: req.user ? req.user.id : null,
      intake_date: new Date(),
      notes: notes || null
    });

    const fullOrder = await ServiceOrder.findByPk(serviceOrder.id, {
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

    return res.status(201).json({
      success: true,
      message: `Intake berhasil! Order Service '${generatedServiceId}' [Cabang ${branchPrefix}] & Device '${device.device_id}' telah terdaftar.`,
      data: fullOrder
    });
  } catch (error) {
    console.error('createIntake error:', error);
    return res.status(500).json({ success: false, message: 'Gagal memproses pendaftaran intake.', error: error.message });
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

    if (assigned_technician_id !== undefined) {
      order.assigned_technician_id = assigned_technician_id || null;
      if (assigned_technician_id && !order.assigned_tech_at) {
        order.assigned_tech_at = new Date();
      }
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
        await order.device.save();
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
    const totalDevices = await Device.count();
    const activeInRepair = await ServiceOrder.count({
      where: {
        status: {
          [Op.in]: ['In Repair', 'Rework', 'QC1 Pending', 'QC2 Pending']
        }
      }
    });

    const totalOrders = await ServiceOrder.count();
    const releasedOrders = await ServiceOrder.count({
      where: { status: 'Released' }
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
      limit: 5,
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
      where: { status: 'Rework' },
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
