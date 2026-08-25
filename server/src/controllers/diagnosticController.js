const { 
  sequelize,
  ServiceOrder, 
  DiagnosticPlanItem, 
  Part, 
  BranchCategoryPrice, 
  Device, 
  Customer, 
  Branch, 
  User,
  Technician
} = require('../models');
const { Op } = require('sequelize');

/**
 * 1. Submit Diagnostic Plan & Calculate Budget (Technician)
 */
const submitDiagnosticPlan = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      fault_description, 
      diagnostics_outcome, 
      selected_categories = [], 
      planned_parts = [] 
    } = req.body;

    // Ensure PostgreSQL table status column exists as VARCHAR(50)
    try { await sequelize.query("ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Intake';"); } catch (e) {}
    try { await sequelize.query('ALTER TABLE "service_orders" ADD COLUMN IF NOT EXISTS "status" VARCHAR(50) DEFAULT \'Intake\';'); } catch (e) {}
    try { await sequelize.query("ALTER TABLE service_orders ALTER COLUMN status TYPE VARCHAR(50) USING status::text;"); } catch (e) {}

    const order = await ServiceOrder.findByPk(id, {
      include: [{ model: Branch, as: 'branch' }]
    });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Service order tidak ditemukan.' });
    }

    // Set diagnostic start time if not recorded
    if (!order.diagnostic_started_at) {
      order.diagnostic_started_at = order.assigned_tech_at || new Date();
    }

    if (fault_description) order.fault_description = fault_description;
    if (diagnostics_outcome) order.notes = diagnostics_outcome;

    // 1. Calculate Estimated Service Fees from BranchCategoryPrice
    let totalServiceCost = 0;
    const categoryNamesStr = Array.isArray(selected_categories) ? selected_categories.join(', ') : selected_categories;

    if (Array.isArray(selected_categories) && selected_categories.length > 0 && order.branch_id) {
      const priceRecords = await BranchCategoryPrice.findAll({
        where: {
          branch_id: order.branch_id,
          category_name: { [Op.in]: selected_categories }
        }
      });

      priceRecords.forEach(p => {
        totalServiceCost += parseFloat(p.price) || 0;
      });
    }

    // 2. Clear previous plan items and insert new requested parts
    await DiagnosticPlanItem.destroy({ where: { service_order_id: order.id } });

    let totalPartCost = 0;
    if (Array.isArray(planned_parts) && planned_parts.length > 0) {
      for (const pItem of planned_parts) {
        const partObj = await Part.findByPk(pItem.part_id);
        const unitCost = partObj ? parseFloat(partObj.unit_cost) || 0 : parseFloat(pItem.unit_cost) || 0;
        const qty = parseInt(pItem.quantity) || 1;
        const itemTotal = unitCost * qty;
        totalPartCost += itemTotal;

        await DiagnosticPlanItem.create({
          service_order_id: order.id,
          part_id: pItem.part_id,
          quantity: qty,
          unit_cost: unitCost,
          total_cost: itemTotal,
          category_name: pItem.category_name || null,
          approval_status: 'Pending'
        });
      }
    }

    // 3. Update Order Budget Totals and Status
    order.estimated_part_cost = totalPartCost;
    order.estimated_service_cost = totalServiceCost;
    order.total_estimated_cost = totalPartCost + totalServiceCost;
    order.status = 'Diagnostic_Pending_Approval';
    order.diagnostic_submitted_at = new Date();
    await order.save();

    const updatedDoc = await ServiceOrder.findByPk(order.id, {
      include: [
        { model: Device, as: 'device' },
        { model: Customer, as: 'customer' },
        { model: Branch, as: 'branch' },
        {
          model: DiagnosticPlanItem,
          as: 'diagnosticPlanItems',
          include: [{ model: Part, as: 'part' }]
        }
      ]
    });

    return res.status(200).json({
      success: true,
      message: 'Rencana Diagnosa & Anggaran Biaya berhasil dikirim ke QC SEA untuk approval.',
      data: updatedDoc
    });
  } catch (error) {
    console.error('submitDiagnosticPlan error:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal mengirim Rencana Diagnosa & Budget.',
      error: error.message
    });
  }
};

/**
 * 2. Get Pending Diagnostic Approvals Queue (QC SEA)
 */
const getPendingDiagnosticApprovals = async (req, res) => {
  try {
    try { await sequelize.query("ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Intake';"); } catch (e) {}

    let orders = [];
    try {
      orders = await ServiceOrder.findAll({
        where: { status: 'Diagnostic_Pending_Approval' },
        include: [
          { model: Device, as: 'device' },
          { model: Customer, as: 'customer' },
          { model: Branch, as: 'branch' },
          { model: Technician, as: 'assignedTechnician', include: [{ model: User, as: 'user' }] },
          {
            model: DiagnosticPlanItem,
            as: 'diagnosticPlanItems',
            include: [{ model: Part, as: 'part' }]
          }
        ],
        order: [['diagnostic_submitted_at', 'ASC']]
      });
    } catch (dbErr) {
      const allOrders = await ServiceOrder.findAll({
        include: [
          { model: Device, as: 'device' },
          { model: Customer, as: 'customer' },
          { model: Branch, as: 'branch' },
          { model: Technician, as: 'assignedTechnician', include: [{ model: User, as: 'user' }] },
          {
            model: DiagnosticPlanItem,
            as: 'diagnosticPlanItems',
            include: [{ model: Part, as: 'part' }]
          }
        ]
      });
      orders = allOrders.filter(o => o.status === 'Diagnostic_Pending_Approval');
    }

    return res.status(200).json({
      success: true,
      count: orders.length,
      data: orders
    });
  } catch (error) {
    console.error('getPendingDiagnosticApprovals error:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal mengambil antrean approval diagnosa QC SEA.',
      error: error.message
    });
  }
};

/**
 * 3. Process QC SEA Diagnostic & Budget Approval Decision
 * Decisions: 'Full_Approve', 'Partial_Approve', 'Not_Approve_Harvest', 'Revision_Requested'
 */
const processSeaDiagnosticApproval = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      overall_decision, 
      approved_item_ids = [], 
      harvest_reason, 
      notes 
    } = req.body;

    if (!overall_decision || !['Full_Approve', 'Partial_Approve', 'Not_Approve_Harvest', 'Revision_Requested'].includes(overall_decision)) {
      return res.status(400).json({
        success: false,
        message: "Opsi keputusan approval harus salah satu dari: 'Full_Approve', 'Partial_Approve', 'Not_Approve_Harvest', atau 'Revision_Requested'."
      });
    }

    const order = await ServiceOrder.findByPk(id, {
      include: [{ model: DiagnosticPlanItem, as: 'diagnosticPlanItems' }]
    });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Service Order tidak ditemukan.' });
    }

    const reviewerId = req.user ? req.user.id : null;
    order.sea_approval_decision = overall_decision;
    order.budget_approved_at = new Date();
    order.budget_approved_by_user_id = reviewerId;

    if (overall_decision === 'Full_Approve') {
      // Approve all plan items
      await DiagnosticPlanItem.update(
        { approval_status: 'Approved' },
        { where: { service_order_id: order.id } }
      );

      order.status = 'In Repair';
      order.repair_started_at = new Date();
      if (notes) order.notes = (order.notes ? order.notes + '\n' : '') + `[QC SEA Approved]: ${notes}`;

    } else if (overall_decision === 'Partial_Approve') {
      // Approve selected items, reject remaining
      const approvedIds = (approved_item_ids || []).map(i => parseInt(i)).filter(Boolean);

      for (const item of order.diagnosticPlanItems) {
        if (approvedIds.includes(item.id)) {
          item.approval_status = 'Approved';
        } else {
          item.approval_status = 'Rejected';
        }
        await item.save();
      }

      // Recalculate approved part cost
      const approvedItems = await DiagnosticPlanItem.findAll({
        where: { service_order_id: order.id, approval_status: 'Approved' }
      });

      let approvedPartCost = 0;
      approvedItems.forEach(i => {
        approvedPartCost += parseFloat(i.total_cost) || 0;
      });

      order.estimated_part_cost = approvedPartCost;
      order.total_estimated_cost = approvedPartCost + parseFloat(order.estimated_service_cost || 0);
      order.status = 'In Repair';
      order.repair_started_at = new Date();
      if (notes) order.notes = (order.notes ? order.notes + '\n' : '') + `[QC SEA Partial Approved]: ${notes}`;

    } else if (overall_decision === 'Not_Approve_Harvest') {
      // Fully Not Approve -> Send to Harvest / Kanibalisasi
      await DiagnosticPlanItem.update(
        { approval_status: 'Rejected' },
        { where: { service_order_id: order.id } }
      );

      order.status = 'Harvested';
      order.harvest_reason = harvest_reason || notes || 'Biaya perbaikan dan kebutuhan sparepart tidak disetujui (Kanibalisasi).';
      if (notes) order.notes = (order.notes ? order.notes + '\n' : '') + `[QC SEA Kanibalisasi]: ${notes}`;

    } else if (overall_decision === 'Revision_Requested') {
      // Send back to Technician for Diagnostic Revision
      order.status = 'Diagnostic_Revision';
      if (notes) order.notes = (order.notes ? order.notes + '\n' : '') + `[QC SEA Minta Revisi]: ${notes}`;
    }

    await order.save();

    const updatedDoc = await ServiceOrder.findByPk(order.id, {
      include: [
        { model: Device, as: 'device' },
        { model: Customer, as: 'customer' },
        { model: Branch, as: 'branch' },
        {
          model: DiagnosticPlanItem,
          as: 'diagnosticPlanItems',
          include: [{ model: Part, as: 'part' }]
        }
      ]
    });

    return res.status(200).json({
      success: true,
      message: `Keputusan approval QC SEA '${overall_decision}' berhasil diproses.`,
      data: updatedDoc
    });
  } catch (error) {
    console.error('processSeaDiagnosticApproval error:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal memproses keputusan approval diagnosa QC SEA.',
      error: error.message
    });
  }
};

module.exports = {
  submitDiagnosticPlan,
  getPendingDiagnosticApprovals,
  processSeaDiagnosticApproval
};
