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

    // Auto-create status column & diagnostic_plan_items table in PostgreSQL if missing
    try { await sequelize.query("ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Intake';"); } catch (e) {}
    try { await sequelize.query('ALTER TABLE "service_orders" ADD COLUMN IF NOT EXISTS "status" VARCHAR(50) DEFAULT \'Intake\';'); } catch (e) {}
    try { await sequelize.query("ALTER TABLE service_orders ALTER COLUMN status TYPE VARCHAR(50) USING status::text;"); } catch (e) {}
    try {
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS diagnostic_plan_items (
          id SERIAL PRIMARY KEY,
          service_order_id INTEGER REFERENCES service_orders(id) ON DELETE CASCADE,
          part_id INTEGER,
          quantity INTEGER DEFAULT 1,
          unit_cost NUMERIC(12,2) DEFAULT 0,
          total_cost NUMERIC(12,2) DEFAULT 0,
          category_name VARCHAR(255),
          approval_status VARCHAR(50) DEFAULT 'Pending',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);
    } catch (e) {}

    const order = await ServiceOrder.findByPk(id, {
      include: [{ model: Branch, as: 'branch' }]
    });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Service order tidak ditemukan.' });
    }

    if (!order.diagnostic_started_at) {
      order.diagnostic_started_at = order.assigned_tech_at || new Date();
    }

    if (fault_description) order.fault_description = fault_description;
    if (diagnostics_outcome) order.notes = diagnostics_outcome;

    // 1. Calculate Estimated Service Fees from BranchCategoryPrice
    let totalServiceCost = 0;
    if (Array.isArray(selected_categories) && selected_categories.length > 0 && order.branch_id) {
      try {
        const priceRecords = await BranchCategoryPrice.findAll({
          where: {
            branch_id: order.branch_id,
            category_name: { [Op.in]: selected_categories }
          }
        });

        priceRecords.forEach(p => {
          totalServiceCost += parseFloat(p.price) || 0;
        });
      } catch (e) {}
    }

    // 2. Clear previous plan items and insert new requested parts
    let totalPartCost = 0;
    try {
      await DiagnosticPlanItem.destroy({ where: { service_order_id: order.id } }).catch(() => null);

      if (Array.isArray(planned_parts) && planned_parts.length > 0) {
        for (const pItem of planned_parts) {
          let unitCost = parseFloat(pItem.unit_cost) || 0;
          try {
            const partObj = await Part.findByPk(pItem.part_id);
            if (partObj) unitCost = parseFloat(partObj.unit_cost) || unitCost;
          } catch (e) {}

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
          }).catch(err => console.error('DiagnosticPlanItem.create warning:', err.message));
        }
      }
    } catch (e) {
      console.error('Diagnostic plan items processing error:', e.message);
    }

    // 3. Update Order Budget Totals and Status explicitly
    order.estimated_part_cost = totalPartCost;
    order.estimated_service_cost = totalServiceCost;
    order.total_estimated_cost = totalPartCost + totalServiceCost;
    order.status = 'Diagnostic_Pending_Approval';
    order.diagnostic_submitted_at = new Date();
    await order.save();

    // Directly update status in DB via raw query as a bulletproof fallback
    try {
      await sequelize.query(
        "UPDATE service_orders SET status = 'Diagnostic_Pending_Approval', total_estimated_cost = :totalCost, diagnostic_submitted_at = NOW() WHERE id = :orderId",
        { replacements: { totalCost: order.total_estimated_cost, orderId: order.id } }
      );
    } catch (e) {}

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

    let allOrders = [];
    try {
      allOrders = await ServiceOrder.findAll({
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
        order: [['created_at', 'DESC']]
      });
    } catch (dbErr) {
      console.error('ServiceOrder.findAll error in getPendingDiagnosticApprovals:', dbErr.message);
    }

    // Filter orders that have submitted diagnostic plans, requested parts, or estimated total cost
    const pendingBudgetOrders = allOrders.filter(o => 
      o.status === 'Diagnostic_Pending_Approval' ||
      (o.diagnosticPlanItems && o.diagnosticPlanItems.length > 0) ||
      parseFloat(o.total_estimated_cost || 0) > 0 ||
      parseFloat(o.estimated_part_cost || 0) > 0 ||
      (o.assigned_technician_id && o.fault_description)
    );

    return res.status(200).json({
      success: true,
      count: pendingBudgetOrders.length,
      data: pendingBudgetOrders
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

    // Auto-create missing approval columns in PostgreSQL if they don't exist
    try { await sequelize.query("ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Intake';"); } catch (e) {}
    try { await sequelize.query("ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS sea_approval_decision VARCHAR(50);"); } catch (e) {}
    try { await sequelize.query("ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS budget_approved_at TIMESTAMP WITH TIME ZONE;"); } catch (e) {}
    try { await sequelize.query("ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS budget_approved_by_user_id INTEGER;"); } catch (e) {}
    try { await sequelize.query("ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS estimated_part_cost NUMERIC(12,2) DEFAULT 0;"); } catch (e) {}
    try { await sequelize.query("ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS estimated_service_cost NUMERIC(12,2) DEFAULT 0;"); } catch (e) {}
    try { await sequelize.query("ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS total_estimated_cost NUMERIC(12,2) DEFAULT 0;"); } catch (e) {}
    try { await sequelize.query("ALTER TABLE diagnostic_plan_items ADD COLUMN IF NOT EXISTS approval_status VARCHAR(50) DEFAULT 'Pending';"); } catch (e) {}

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
      // Approve all plan items safely
      try {
        await DiagnosticPlanItem.update(
          { approval_status: 'Approved' },
          { where: { service_order_id: order.id } }
        );
      } catch (e) {}

      order.status = 'In Repair';
      order.repair_started_at = new Date();
      if (notes) order.notes = (order.notes ? order.notes + '\n' : '') + `[QC SEA Approved]: ${notes}`;

    } else if (overall_decision === 'Partial_Approve') {
      // Approve selected items, reject remaining
      const approvedIds = (approved_item_ids || []).map(i => parseInt(i)).filter(Boolean);

      if (order.diagnosticPlanItems && order.diagnosticPlanItems.length > 0) {
        for (const item of order.diagnosticPlanItems) {
          try {
            if (approvedIds.includes(item.id)) {
              item.approval_status = 'Approved';
            } else {
              item.approval_status = 'Rejected';
            }
            await item.save();
          } catch (e) {}
        }
      }

      // Recalculate approved part cost
      let approvedPartCost = 0;
      try {
        const approvedItems = await DiagnosticPlanItem.findAll({
          where: { service_order_id: order.id, approval_status: 'Approved' }
        });

        approvedItems.forEach(i => {
          approvedPartCost += parseFloat(i.total_cost) || 0;
        });
      } catch (e) {}

      order.estimated_part_cost = approvedPartCost;
      order.total_estimated_cost = approvedPartCost + parseFloat(order.estimated_service_cost || 0);
      order.status = 'In Repair';
      order.repair_started_at = new Date();
      if (notes) order.notes = (order.notes ? order.notes + '\n' : '') + `[QC SEA Partial Approved]: ${notes}`;

    } else if (overall_decision === 'Not_Approve_Harvest') {
      // Fully Not Approve -> Send to Harvest / Kanibalisasi
      try {
        await DiagnosticPlanItem.update(
          { approval_status: 'Rejected' },
          { where: { service_order_id: order.id } }
        );
      } catch (e) {}

      order.status = 'Harvested';
      order.harvest_reason = harvest_reason || notes || 'Biaya perbaikan dan kebutuhan sparepart tidak disetujui (Kanibalisasi).';
      if (notes) order.notes = (order.notes ? order.notes + '\n' : '') + `[QC SEA Kanibalisasi]: ${notes}`;

    } else if (overall_decision === 'Revision_Requested') {
      // Send back to Technician for Diagnostic Revision
      order.status = 'Diagnostic_Revision';
      if (notes) order.notes = (order.notes ? order.notes + '\n' : '') + `[QC SEA Minta Revisi]: ${notes}`;
    }

    try { await order.save(); } catch (e) {}

    // Directly update status in DB via raw query as a bulletproof fallback
    try {
      await sequelize.query(
        "UPDATE service_orders SET status = :status, sea_approval_decision = :decision, budget_approved_at = NOW() WHERE id = :id",
        { replacements: { status: order.status, decision: overall_decision, id: order.id } }
      );
    } catch (e) {}

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
