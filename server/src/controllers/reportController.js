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

module.exports = {
  getTechnicianTaskReport,
  getDeviceTaskReport,
  getBASTDocument
};
