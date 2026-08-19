const { Op } = require('sequelize');
const { ServiceOrder, Device, Customer, Technician, User, Branch } = require('../models');

// Status Groups
const DONE_STATUSES = ['QC Passed', 'Ready for Pickup', 'Released'];
const IN_PROGRESS_STATUSES = ['In Repair'];
const PENDING_STATUSES = ['Intake', 'Waiting Parts'];
const QC_STATUSES = ['QC1 Pending', 'QC2 Pending'];

/**
 * 1. Technician Task Status Report
 * Returns status breakdown per technician: Pending, In Repair, QC, Done, Total, Completion Rate, Workload
 */
const getTechnicianTaskReport = async (req, res) => {
  try {
    const { branch_id } = req.query;

    let userWhere = { role: 'Technician', is_active: true };
    if (branch_id) {
      userWhere[Op.or] = [{ branch_id: branch_id }, { branch_id: null }];
    }

    // Fetch technicians with user and branch profiles
    const technicians = await Technician.findAll({
      include: [
        {
          model: User,
          as: 'user',
          where: userWhere,
          include: [{ model: Branch, as: 'branch', attributes: ['id', 'name', 'code'] }]
        }
      ]
    });

    // Fetch all service orders (filtered by branch if provided)
    let orderWhere = {};
    if (branch_id) {
      orderWhere.branch_id = branch_id;
    }

    const allOrders = await ServiceOrder.findAll({
      where: orderWhere,
      attributes: ['id', 'service_id', 'status', 'assigned_technician_id', 'created_at', 'updated_at']
    });

    const technicianReports = technicians.map(tech => {
      const techUser = tech.user;
      const techOrders = allOrders.filter(o => o.assigned_technician_id === tech.id);

      const pendingCount = techOrders.filter(o => PENDING_STATUSES.includes(o.status)).length;
      const inProgressCount = techOrders.filter(o => IN_PROGRESS_STATUSES.includes(o.status)).length;
      const qcCount = techOrders.filter(o => QC_STATUSES.includes(o.status)).length;
      const doneCount = techOrders.filter(o => DONE_STATUSES.includes(o.status)).length;
      
      const totalTasks = techOrders.length;
      const activeTasks = pendingCount + inProgressCount + qcCount;
      const completionRate = totalTasks > 0 ? Math.round((doneCount / totalTasks) * 100) : 0;

      let workloadStatus = 'Free';
      if (activeTasks >= 5) {
        workloadStatus = 'Overloaded';
      } else if (activeTasks >= 2) {
        workloadStatus = 'Optimal';
      }

      return {
        technician_id: tech.id,
        employee_code: tech.employee_code,
        full_name: techUser ? techUser.full_name : 'Teknisi',
        email: techUser ? techUser.email : '',
        skill_level: tech.skill_level,
        branch: techUser && techUser.branch ? techUser.branch : null,
        pendingCount,
        inProgressCount,
        qcCount,
        doneCount,
        activeTasks,
        totalTasks,
        completionRate,
        workloadStatus
      };
    });

    // Summary counters
    const totalTechs = technicianReports.length;
    const totalDoneTasks = technicianReports.reduce((acc, t) => acc + t.doneCount, 0);
    const totalActiveTasks = technicianReports.reduce((acc, t) => acc + t.activeTasks, 0);

    return res.status(200).json({
      success: true,
      data: {
        summary: {
          totalTechs,
          totalDoneTasks,
          totalActiveTasks
        },
        technicians: technicianReports
      }
    });
  } catch (error) {
    console.error('Error in getTechnicianTaskReport:', error);
    return res.status(500).json({ success: false, message: 'Gagal mengambil laporan status task per teknisi.', error: error.message });
  }
};

/**
 * 2. Done Tasks & Device Status Report (Sudah vs Belum Dikerjakan)
 */
const getDeviceTaskReport = async (req, res) => {
  try {
    const { branch_id, status_filter } = req.query;

    let whereClause = {};
    if (branch_id) {
      whereClause.branch_id = branch_id;
    }

    const orders = await ServiceOrder.findAll({
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

    const totalDevices = orders.length;
    const doneOrders = orders.filter(o => DONE_STATUSES.includes(o.status));
    const inProgressOrders = orders.filter(o => IN_PROGRESS_STATUSES.includes(o.status));
    const pendingOrders = orders.filter(o => PENDING_STATUSES.includes(o.status));
    const qcPendingOrders = orders.filter(o => QC_STATUSES.includes(o.status));

    const doneCount = doneOrders.length;
    const inProgressCount = inProgressOrders.length;
    const pendingCount = pendingOrders.length;
    const qcPendingCount = qcPendingOrders.length;
    const totalBelumDikerjakan = pendingCount + inProgressCount + qcPendingCount;

    const donePercentage = totalDevices > 0 ? Math.round((doneCount / totalDevices) * 100) : 0;
    const belumDikerjakanPercentage = totalDevices > 0 ? Math.round((totalBelumDikerjakan / totalDevices) * 100) : 0;

    // Filter order items if status_filter param specified
    let filteredOrders = orders;
    if (status_filter === 'done') {
      filteredOrders = doneOrders;
    } else if (status_filter === 'pending') {
      filteredOrders = orders.filter(o => !DONE_STATUSES.includes(o.status));
    }

    const formattedOrders = filteredOrders.map(o => {
      const isDone = DONE_STATUSES.includes(o.status);
      return {
        id: o.id,
        service_id: o.service_id,
        device_id: o.device ? o.device.device_id : '',
        brand_model: o.device ? `${o.device.brand} ${o.device.model}` : '',
        serial_number: o.device ? o.device.serial_number : '',
        asset_type: o.device ? o.device.asset_type : '',
        customer_name: o.customer ? o.customer.name : 'Unknown Customer',
        technician_name: o.assignedTechnician && o.assignedTechnician.user ? o.assignedTechnician.user.full_name : 'Unassigned',
        branch: o.branch,
        status: o.status,
        is_done: isDone,
        created_at: o.created_at,
        updated_at: o.updated_at
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        summary: {
          totalDevices,
          doneCount,
          totalBelumDikerjakan,
          inProgressCount,
          pendingCount,
          qcPendingCount,
          donePercentage,
          belumDikerjakanPercentage
        },
        orders: formattedOrders
      }
    });
  } catch (error) {
    console.error('Error in getDeviceTaskReport:', error);
    return res.status(500).json({ success: false, message: 'Gagal mengambil laporan status pengerjaan perangkat.', error: error.message });
  }
};

/**
 * 3. BAST Document Detail Endpoint
 * Fetches full details for a Service Order to generate BAST Handover document with Coordinator signature
 */
const getBASTDocument = async (req, res) => {
  try {
    const { id } = req.params;

    const { PartConsumed, Part, RepairLog } = require('../models');

    const order = await ServiceOrder.findByPk(id, {
      include: [
        { model: Device, as: 'device' },
        { model: Customer, as: 'customer' },
        { model: Branch, as: 'branch' },
        {
          model: Technician,
          as: 'assignedTechnician',
          include: [{ model: User, as: 'user', attributes: ['id', 'full_name', 'email', 'role'] }]
        },
        { model: User, as: 'receivedBy', attributes: ['id', 'full_name', 'email', 'role', 'signature_url'] },
        {
          model: PartConsumed,
          as: 'consumedParts',
          include: [{ model: Part, as: 'part' }]
        },
        {
          model: RepairLog,
          as: 'repairLogs'
        }
      ]
    });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Service Order tidak ditemukan.' });
    }

    // Find branch coordinator or logged in coordinator signature
    let coordinatorUser = null;
    if (order.receivedBy && (order.receivedBy.role === 'Coordinator' || order.receivedBy.role === 'Admin')) {
      coordinatorUser = order.receivedBy;
    } else {
      // Find any active coordinator in the same branch or global
      let coordWhere = { role: 'Coordinator', is_active: true };
      if (order.branch_id) {
        coordWhere[Op.or] = [{ branch_id: order.branch_id }, { branch_id: null }];
      }
      coordinatorUser = await User.findOne({
        where: coordWhere,
        attributes: ['id', 'full_name', 'email', 'role', 'signature_url']
      });
    }

    // Fallback if no specific coordinator user found, use logged-in user if Coordinator/Admin
    if (!coordinatorUser && (req.user.role === 'Coordinator' || req.user.role === 'Admin')) {
      coordinatorUser = await User.findByPk(req.user.id, {
        attributes: ['id', 'full_name', 'email', 'role', 'signature_url']
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        order,
        coordinator: coordinatorUser
      }
    });
  } catch (error) {
    console.error('Error in getBASTDocument:', error);
    return res.status(500).json({ success: false, message: 'Gagal mengambil dokumen BAST.', error: error.message });
  }
};

/**
 * 4. Export KPI Data Excel (CSV)
 * Exports full lifecycle timestamps per service order into Excel-compatible CSV format
 */
const exportKPICSV = async (req, res) => {
  try {
    const orders = await ServiceOrder.findAll({
      include: [
        { model: Device, as: 'device' },
        { model: Customer, as: 'customer' },
        { model: Branch, as: 'branch' },
        {
          model: Technician,
          as: 'assignedTechnician',
          include: [{ model: User, as: 'user', attributes: ['id', 'full_name'] }]
        }
      ],
      order: [['created_at', 'DESC']]
    });

    const formatDateTime = (dt) => {
      if (!dt) return '-';
      const d = new Date(dt);
      if (isNaN(d.getTime())) return '-';
      return d.toLocaleString('id-ID', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    };

    const headers = [
      'No',
      'Service ID',
      'Device ID',
      'Serial Number',
      'Brand & Model',
      'Asset Type',
      'Customer',
      'Cabang / Branch',
      'Teknisi Penanggung Jawab',
      'Status Unit',
      '1. Tanggal Intake (Intake Date)',
      '2. Tanggal Assign Teknisi (Assigned Date)',
      '3. Tanggal Mulai Perbaikan (Repair Started)',
      '4. Tanggal Selesai Perbaikan (Repair Finished)',
      '5. Tanggal Mulai QC1 Arisa (QC1 Started)',
      '6. Tanggal Selesai QC1 Arisa (QC1 Finished)',
      '7. Tanggal Mulai QC2 Shopee (QC2 Started)',
      '8. Tanggal Selesai QC2 Shopee (QC2 Finished)',
      '9. Tanggal Release Unit (Released Date)'
    ];

    const rows = orders.map((o, idx) => [
      idx + 1,
      `"${o.service_id || ''}"`,
      `"${o.device?.device_id || ''}"`,
      `"${o.device?.serial_number || ''}"`,
      `"${o.device ? `${o.device.brand} ${o.device.model}` : ''}"`,
      `"${o.device?.asset_type || ''}"`,
      `"${o.customer?.name || ''}"`,
      `"${o.branch?.name || ''}"`,
      `"${o.assignedTechnician?.user?.full_name || 'Unassigned'}"`,
      `"${o.status || ''}"`,
      `"${formatDateTime(o.intake_date || o.created_at)}"`,
      `"${formatDateTime(o.assigned_tech_at)}"`,
      `"${formatDateTime(o.repair_started_at)}"`,
      `"${formatDateTime(o.repair_finished_at)}"`,
      `"${formatDateTime(o.qc1_started_at)}"`,
      `"${formatDateTime(o.qc1_finished_at)}"`,
      `"${formatDateTime(o.qc2_started_at)}"`,
      `"${formatDateTime(o.qc2_finished_at)}"`,
      `"${formatDateTime(o.released_date)}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="KPI_Report_Lifecycle_Timestamps.csv"');
    return res.status(200).send(csvContent);
  } catch (error) {
    console.error('Error in exportKPICSV:', error);
    return res.status(500).json({ success: false, message: 'Gagal mengeksport data KPI ke CSV.', error: error.message });
  }
};

/**
 * 5. BAST 1: Daily Intake Report (Shopee -> Arisa)
 * Query params: date (YYYY-MM-DD), branch_id
 */
const getIntakeDailyBASTReport = async (req, res) => {
  try {
    const { date, branch_id } = req.query;
    const targetDate = date || new Date().toISOString().slice(0, 10);

    const startOfDay = new Date(`${targetDate}T00:00:00.000Z`);
    const endOfDay = new Date(`${targetDate}T23:59:59.999Z`);

    let whereClause = {
      intake_date: { [Op.between]: [startOfDay, endOfDay] }
    };
    if (branch_id) {
      whereClause.branch_id = branch_id;
    }

    const orders = await ServiceOrder.findAll({
      where: whereClause,
      include: [
        { model: Device, as: 'device' },
        { model: Customer, as: 'customer' },
        { model: Branch, as: 'branch' }
      ],
      order: [['created_at', 'ASC']]
    });

    const items = orders.map((o, idx) => ({
      no: idx + 1,
      asset_id: o.device?.device_id || '-',
      asset_tag: o.device?.asset_tag || o.device?.device_id || '-',
      brand_model: o.device ? `${o.device.brand} ${o.device.model}` : '-',
      initial_physical_condition: o.fault_description || 'Good Condition',
      accessories: o.device?.accessories || 'Charger + Bag'
    }));

    return res.status(200).json({
      success: true,
      data: {
        date: targetDate,
        total_units: items.length,
        items
      }
    });
  } catch (error) {
    console.error('Error in getIntakeDailyBASTReport:', error);
    return res.status(500).json({ success: false, message: 'Gagal mengambil data BAST Intake Harian.', error: error.message });
  }
};

/**
 * 6. BAST 2: Weekly Completed Return Report (Arisa -> Shopee)
 * Query params: startDate (YYYY-MM-DD), endDate (YYYY-MM-DD), branch_id
 */
const getCompletedWeeklyBASTReport = async (req, res) => {
  try {
    const { startDate, endDate, branch_id } = req.query;

    const start = startDate ? new Date(`${startDate}T00:00:00.000Z`) : new Date(Date.now() - 7 * 86400000);
    const end = endDate ? new Date(`${endDate}T23:59:59.999Z`) : new Date();

    let whereClause = {
      status: DONE_STATUSES,
      updated_at: { [Op.between]: [start, end] }
    };
    if (branch_id) {
      whereClause.branch_id = branch_id;
    }

    const orders = await ServiceOrder.findAll({
      where: whereClause,
      include: [
        { model: Device, as: 'device' },
        { model: Customer, as: 'customer' },
        { model: Branch, as: 'branch' }
      ],
      order: [['updated_at', 'DESC']]
    });

    const items = orders.map((o, idx) => ({
      no: idx + 1,
      asset_id: o.device?.device_id || '-',
      service_id: o.service_id,
      repair_type: 'Item Jasa + Part',
      final_status: o.status === 'Released' ? 'Completed' : 'Repaired',
      qc_result: 'Pass'
    }));

    return res.status(200).json({
      success: true,
      data: {
        startDate: start.toISOString().slice(0, 10),
        endDate: end.toISOString().slice(0, 10),
        total_units: items.length,
        items
      }
    });
  } catch (error) {
    console.error('Error in getCompletedWeeklyBASTReport:', error);
    return res.status(500).json({ success: false, message: 'Gagal mengambil data BAST Pengembalian Pekanan.', error: error.message });
  }
};

/**
 * 7. BAST 3: Weekly Used Spare Parts Report (Part Rusak)
 * Query params: startDate (YYYY-MM-DD), endDate (YYYY-MM-DD), branch_id
 */
const getUsedSparePartsWeeklyBASTReport = async (req, res) => {
  try {
    const { startDate, endDate, branch_id } = req.query;
    const { BrokenPart } = require('../models');

    const start = startDate ? new Date(`${startDate}T00:00:00.000Z`) : new Date(Date.now() - 7 * 86400000);
    const end = endDate ? new Date(`${endDate}T23:59:59.999Z`) : new Date();

    let whereClause = {
      created_at: { [Op.between]: [start, end] }
    };

    let includeOrder = {
      model: ServiceOrder,
      as: 'serviceOrder',
      include: [{ model: Device, as: 'device' }]
    };

    if (branch_id) {
      includeOrder.where = { branch_id };
    }

    const brokenParts = await BrokenPart.findAll({
      where: whereClause,
      include: [
        includeOrder,
        { model: Device, as: 'device' },
        { model: User, as: 'reportedBy', attributes: ['id', 'full_name'] }
      ],
      order: [['created_at', 'DESC']]
    });

    const items = brokenParts.map((bp, idx) => ({
      no: idx + 1,
      asset_id: bp.device ? bp.device.device_id : (bp.serviceOrder?.device?.device_id || '-'),
      spare_part_name: bp.category_name + (bp.serial_number ? ` (SN: ${bp.serial_number})` : ''),
      quantity: 1,
      condition: bp.damage_reason || 'Defective Part'
    }));

    return res.status(200).json({
      success: true,
      data: {
        items
      }
    });
  } catch (error) {
    console.error('Error in getUsedSparePartsWeeklyBASTReport:', error);
    return res.status(500).json({ success: false, message: 'Gagal mengambil data BAST Used Spare Parts Pekanan.', error: error.message });
  }
};

/**
 * Diagnostic Device Count & Billing Calculator (Admin Only)
 * Acuan Penagihan Fee dari PT Data Treasure Indonesia (DTI) ke PT Arisa
 * 1 device intake yang melewati fase General Diagnostics di-charge Rp 30.000 (dapat disesuaikan per cabang)
 */
const getDiagnosticDeviceCountReport = async (req, res) => {
  try {
    const { startDate, endDate, branch_id } = req.query;

    let dateWhere = {};
    if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      dateWhere = {
        [Op.or]: [
          { repair_started_at: { [Op.between]: [start, end] } },
          { intake_date: { [Op.between]: [start, end] } },
          { created_at: { [Op.between]: [start, end] } }
        ]
      };
    }

    let orderWhere = { ...dateWhere };
    if (branch_id) {
      orderWhere.branch_id = branch_id;
    }

    // Fetch branches with diagnostic_fee
    const branches = await Branch.findAll({
      where: { is_active: true },
      order: [['name', 'ASC']]
    });

    // Fetch all service orders matching criteria
    const orders = await ServiceOrder.findAll({
      where: orderWhere,
      include: [
        {
          model: Device,
          as: 'device',
          attributes: ['id', 'device_id', 'brand', 'model', 'serial_number', 'asset_type']
        },
        {
          model: Branch,
          as: 'branch',
          attributes: ['id', 'name', 'code', 'diagnostic_fee']
        },
        {
          model: Technician,
          as: 'assignedTechnician',
          include: [{ model: User, as: 'user', attributes: ['id', 'full_name', 'username'] }]
        }
      ],
      order: [['created_at', 'DESC']]
    });

    // Map branches into lookup map
    const branchMap = {};
    branches.forEach(b => {
      branchMap[b.id] = {
        branch_id: b.id,
        branch_name: b.name,
        branch_code: b.code,
        diagnostic_fee: b.diagnostic_fee !== undefined && b.diagnostic_fee !== null ? b.diagnostic_fee : 30000,
        total_intake: 0,
        total_diagnosed: 0,
        total_pending: 0,
        total_billing: 0
      };
    });

    // Include unknown/no-branch fallback
    branchMap[0] = {
      branch_id: 0,
      branch_name: 'Pusat / Unassigned',
      branch_code: 'HQ',
      diagnostic_fee: 30000,
      total_intake: 0,
      total_diagnosed: 0,
      total_pending: 0,
      total_billing: 0
    };

    const detailedDevices = [];

    orders.forEach(order => {
      const bId = order.branch_id && branchMap[order.branch_id] ? order.branch_id : 0;
      const branchInfo = branchMap[bId];
      const feePerUnit = branchInfo.diagnostic_fee || 30000;

      // Status check: General Diagnostics is completed if repair_started_at is set OR status != 'Intake'
      const isDiagnosed = Boolean(
        order.repair_started_at || 
        ['In Repair', 'QC1 Pending', 'Rework', 'QC2 Pending', 'Released', 'Harvested'].includes(order.status)
      );

      branchInfo.total_intake += 1;
      if (isDiagnosed) {
        branchInfo.total_diagnosed += 1;
        branchInfo.total_billing += feePerUnit;
      } else {
        branchInfo.total_pending += 1;
      }

      detailedDevices.push({
        id: order.id,
        service_id: order.service_id,
        device_brand: order.device ? order.device.brand : '-',
        device_model: order.device ? order.device.model : '-',
        serial_number: order.device ? order.device.serial_number : '-',
        asset_type: order.device ? order.device.asset_type : '-',
        branch_id: bId,
        branch_name: branchInfo.branch_name,
        branch_code: branchInfo.branch_code,
        technician_name: order.assignedTechnician && order.assignedTechnician.user ? order.assignedTechnician.user.full_name : 'Belum Ditugaskan',
        diagnostic_date: order.repair_started_at || (isDiagnosed ? order.intake_date : null),
        intake_date: order.intake_date || order.created_at,
        status: order.status,
        is_diagnosed: isDiagnosed,
        fee_amount: isDiagnosed ? feePerUnit : 0
      });
    });

    const branchBreakdown = Object.values(branchMap).filter(b => b.branch_id !== 0 || b.total_intake > 0);

    const totalIntakeAll = branchBreakdown.reduce((acc, b) => acc + b.total_intake, 0);
    const totalDiagnosedAll = branchBreakdown.reduce((acc, b) => acc + b.total_diagnosed, 0);
    const totalPendingAll = branchBreakdown.reduce((acc, b) => acc + b.total_pending, 0);
    const totalBillingAll = branchBreakdown.reduce((acc, b) => acc + b.total_billing, 0);

    return res.status(200).json({
      success: true,
      data: {
        filter: {
          startDate: startDate || null,
          endDate: endDate || null,
          branch_id: branch_id || null
        },
        summary: {
          total_intake: totalIntakeAll,
          total_diagnosed: totalDiagnosedAll,
          total_pending: totalPendingAll,
          total_billing_amount: totalBillingAll,
          default_rate: 30000
        },
        branch_breakdown: branchBreakdown,
        devices: detailedDevices
      }
    });
  } catch (error) {
    console.error('Error in getDiagnosticDeviceCountReport:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal menghitung jumlah perangkat diagnostik.',
      error: error.message
    });
  }
};

module.exports = {
  getTechnicianTaskReport,
  getDeviceTaskReport,
  getBASTDocument,
  exportKPICSV,
  getIntakeDailyBASTReport,
  getCompletedWeeklyBASTReport,
  getUsedSparePartsWeeklyBASTReport,
  getDiagnosticDeviceCountReport
};
