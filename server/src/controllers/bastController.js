const { Op } = require('sequelize');
const { BastDocument, BastItem, ServiceOrder, Device, User, Branch, Customer } = require('../models');

// Helper to generate BAST Document Number
const generateBastNo = async (type = '1') => {
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, '0');
  const count = await BastDocument.count({
    where: {
      bast_type: type,
      created_at: {
        [Op.gte]: new Date(`${year}-01-01T00:00:00.000Z`)
      }
    }
  });
  const typeCode = type === '1' ? 'SHP-ARS' : type === '2' ? 'ARS-SHP' : 'PARTS';
  
  let seq = count + 1;
  let candidate = `BAST/${typeCode}/${year}/${month}/${String(seq).padStart(3, '0')}`;

  // Ensure candidate number is uniquely incremented if candidate exists in DB
  while (await BastDocument.findOne({ where: { bast_number: candidate } })) {
    seq++;
    candidate = `BAST/${typeCode}/${year}/${month}/${String(seq).padStart(3, '0')}`;
  }
  return candidate;
};

/**
 * 1. Create and Submit BAST Document (Coordinator Arisa)
 */
const createBast = async (req, res) => {
  try {
    const {
      bast_number,
      bast_type = '1',
      intake_date,
      start_date,
      end_date,
      branch_id,
      service_order_ids = [],
      first_party_title = 'Arisa Computer Team',
      first_party_signature,
      notes
    } = req.body;

    const { sequelize } = require('../models');

    // Auto-create missing BAST tables and columns in PostgreSQL if they don't exist
    try {
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS bast_documents (
          id SERIAL PRIMARY KEY,
          bast_number VARCHAR(100) UNIQUE NOT NULL,
          bast_type VARCHAR(20) DEFAULT '1',
          intake_date DATE,
          start_date DATE,
          end_date DATE,
          branch_id INTEGER,
          status VARCHAR(50) DEFAULT 'Submitted_to_SEA',
          first_party_user_id INTEGER,
          first_party_title VARCHAR(255),
          first_party_signature TEXT,
          second_party_user_id INTEGER,
          second_party_title VARCHAR(255),
          second_party_signature TEXT,
          rejection_reason TEXT,
          notes TEXT,
          submitted_at TIMESTAMP WITH TIME ZONE,
          verified_at TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);
    } catch (e) {}

    try {
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS bast_items (
          id SERIAL PRIMARY KEY,
          bast_document_id INTEGER REFERENCES bast_documents(id) ON DELETE CASCADE,
          service_order_id INTEGER,
          device_id INTEGER,
          verification_status VARCHAR(50) DEFAULT 'Pending',
          verification_notes TEXT,
          initial_physical_condition TEXT,
          accessories TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);
    } catch (e) {}

    const firstPartyUserId = req.user ? req.user.id : null;
    let signatureUrl = first_party_signature || null;
    if (!signatureUrl && req.user) {
      try {
        const userObj = await User.findByPk(req.user.id);
        signatureUrl = userObj?.signature_url || null;
      } catch (e) {}
    }

    // Find target Service Orders
    let orders = [];
    if (service_order_ids && service_order_ids.length > 0) {
      orders = await ServiceOrder.findAll({
        where: { id: service_order_ids },
        include: [{ model: Device, as: 'device' }]
      });
    }

    // Fallback: If no orders found by IDs, lookup all Service Orders for the specified intake_date
    if (orders.length === 0 && (intake_date || bast_type === '1')) {
      const targetDate = intake_date || new Date().toISOString().slice(0, 10);
      const startOfDay = new Date(`${targetDate}T00:00:00.000Z`);
      const endOfDay = new Date(`${targetDate}T23:59:59.999Z`);

      let orderWhere = {
        intake_date: { [Op.between]: [startOfDay, endOfDay] }
      };
      if (branch_id) {
        orderWhere.branch_id = branch_id;
      }

      orders = await ServiceOrder.findAll({
        where: orderWhere,
        include: [{ model: Device, as: 'device' }]
      });
    }

    if (orders.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Tidak ada unit intake terdaftar yang dapat dimasukkan ke dalam BAST pada tanggal ini.'
      });
    }

    const docNumber = bast_number || (await generateBastNo(bast_type));

    // 1. Strict Check: Check if BAST Document already exists for this bast_number
    let bastDoc = await BastDocument.findOne({ where: { bast_number: docNumber } });

    if (bastDoc && bastDoc.status !== 'Revision_Requested') {
      const statusLabel = bastDoc.status === 'Approved_SEA' ? 'Approved Client' : 'Menunggu Verifikasi QC Client';
      return res.status(400).json({
        success: false,
        message: `Gagal membuat BAST: Nomor BAST '${docNumber}' sudah pernah dibuat dan terdaftar di sistem (Status: ${statusLabel}). Nomor BAST yang sudah dibuat tidak dapat di-generate ulang.`
      });
    }

    // 2. Strict Check: Check if any of the devices are ALREADY linked to an active BAST Document
    const orderIds = orders.map(o => o.id);
    const existingBastItems = await BastItem.findAll({
      where: { service_order_id: orderIds },
      include: [
        {
          model: BastDocument,
          as: 'bastDocument',
          where: {
            status: { [Op.in]: ['Submitted_to_SEA', 'Approved_SEA'] }
          }
        },
        { model: ServiceOrder, as: 'serviceOrder' }
      ]
    });

    // Exclude items belonging to bastDoc if bastDoc is in Revision_Requested mode
    const conflictItems = existingBastItems.filter(item => !bastDoc || item.bast_document_id !== bastDoc.id);

    if (conflictItems.length > 0) {
      const conflictServiceIds = conflictItems
        .map(item => item.serviceOrder?.service_id || `ID-${item.service_order_id}`)
        .join(', ');
      const conflictBastNo = conflictItems[0]?.bastDocument?.bast_number || 'lain';
      return res.status(400).json({
        success: false,
        message: `Gagal membuat BAST: Perangkat [${conflictServiceIds}] sudah terdaftar pada Dokumen BAST '${conflictBastNo}'. Perangkat yang sudah masuk BAST tidak dapat dimasukkan ke nomor BAST lain.`
      });
    }

    if (bastDoc) {
      bastDoc.status = 'Submitted_to_SEA';
      bastDoc.first_party_user_id = firstPartyUserId;
      bastDoc.first_party_title = first_party_title;
      if (signatureUrl) bastDoc.first_party_signature = signatureUrl;
      bastDoc.submitted_at = new Date();
      bastDoc.rejection_reason = null;
      if (notes) bastDoc.notes = notes;
      await bastDoc.save();

      // Clear old items for fresh list insertion
      await BastItem.destroy({ where: { bast_document_id: bastDoc.id } });
    } else {
      bastDoc = await BastDocument.create({
        bast_number: docNumber,
        bast_type,
        intake_date: intake_date || new Date().toISOString().slice(0, 10),
        start_date: start_date || null,
        end_date: end_date || null,
        branch_id: branch_id || (req.user ? req.user.branch_id : null),
        status: 'Submitted_to_SEA',
        first_party_user_id: firstPartyUserId,
        first_party_title,
        first_party_signature: signatureUrl,
        notes: notes || null,
        submitted_at: new Date()
      });
    }

    // Create BAST Items and update Service Orders
    for (const order of orders) {
      await BastItem.create({
        bast_document_id: bastDoc.id,
        service_order_id: order.id,
        device_id: order.device_id,
        verification_status: 'Pending',
        initial_physical_condition: order.fault_description || 'Good Condition',
        accessories: order.device?.accessories || 'Charger + Bag'
      });

      order.bast_status = 'Submitted_to_SEA';
      await order.save();
    }

    const fullDoc = await BastDocument.findByPk(bastDoc.id, {
      include: [
        {
          model: BastItem,
          as: 'items',
          include: [
            {
              model: ServiceOrder,
              as: 'serviceOrder',
              include: [{ model: Device, as: 'device' }, { model: Customer, as: 'customer' }]
            }
          ]
        },
        { model: User, as: 'firstPartyUser', attributes: ['id', 'full_name', 'email', 'role'] },
        { model: Branch, as: 'branch' }
      ]
    });

    return res.status(201).json({
      success: true,
      message: `Dokumen BAST '${docNumber}' berhasil dibuat dan dikirim ke QC SEA untuk verifikasi!`,
      data: fullDoc
    });
  } catch (error) {
    console.error('createBast error:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal membuat dokumen BAST.',
      error: error.message
    });
  }
};

/**
 * 2. Get Pending BAST Documents for QC SEA Verification Task Queue
 */
const getPendingSeaBasts = async (req, res) => {
  try {
    const { branch_id, status } = req.query;
    let whereClause = { bast_type: '1' };

    if (status) {
      whereClause.status = status;
    }

    if (branch_id) {
      whereClause.branch_id = branch_id;
    }

    const basts = await BastDocument.findAll({
      where: whereClause,
      include: [
        {
          model: BastItem,
          as: 'items',
          include: [
            {
              model: ServiceOrder,
              as: 'serviceOrder',
              include: [{ model: Device, as: 'device' }, { model: Customer, as: 'customer' }]
            }
          ]
        },
        { model: User, as: 'firstPartyUser', attributes: ['id', 'full_name', 'email', 'role'] },
        { model: Branch, as: 'branch' }
      ],
      order: [['created_at', 'DESC']]
    });

    return res.status(200).json({
      success: true,
      count: basts.length,
      data: basts
    });
  } catch (error) {
    console.error('getPendingSeaBasts error:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal mengambil antrean BAST QC SEA.',
      error: error.message
    });
  }
};

/**
 * 3. Get Single BAST Document Detail
 */
const getBastById = async (req, res) => {
  try {
    const { id } = req.params;

    const bast = await BastDocument.findByPk(id, {
      include: [
        {
          model: BastItem,
          as: 'items',
          include: [
            {
              model: ServiceOrder,
              as: 'serviceOrder',
              include: [{ model: Device, as: 'device' }, { model: Customer, as: 'customer' }]
            }
          ]
        },
        { model: User, as: 'firstPartyUser', attributes: ['id', 'full_name', 'email', 'role', 'signature_url'] },
        { model: User, as: 'secondPartyUser', attributes: ['id', 'full_name', 'email', 'role', 'signature_url'] },
        { model: Branch, as: 'branch' }
      ]
    });

    if (!bast) {
      return res.status(404).json({ success: false, message: 'Dokumen BAST tidak ditemukan.' });
    }

    return res.status(200).json({ success: true, data: bast });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Gagal mengambil detail BAST.', error: error.message });
  }
};

/**
 * 4. Verify BAST Document by QC SEA (Shopee Approval / Rejection per Item)
 */
const verifyBastBySea = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      items = [],
      overall_decision, // 'Approved' or 'Revision_Requested'
      second_party_title = 'Asset PIC / QC - Client',
      second_party_signature,
      rejection_reason,
      notes
    } = req.body;

    if (!overall_decision || !['Approved', 'Revision_Requested'].includes(overall_decision)) {
      return res.status(400).json({
        success: false,
        message: "Harap tentukan Keputusan Akhir Verifikasi ('Approved' atau 'Revision_Requested')."
      });
    }

    const bast = await BastDocument.findByPk(id, {
      include: [{ model: BastItem, as: 'items' }]
    });

    if (!bast) {
      return res.status(404).json({ success: false, message: 'Dokumen BAST tidak ditemukan.' });
    }

    // 1. Update item-level verification statuses
    if (items && items.length > 0) {
      for (const itemUpdate of items) {
        const itemRecord = await BastItem.findOne({
          where: { id: itemUpdate.id, bast_document_id: bast.id }
        });
        if (itemRecord) {
          if (itemUpdate.verification_status) {
            itemRecord.verification_status = itemUpdate.verification_status;
          }
          if (itemUpdate.verification_notes !== undefined) {
            itemRecord.verification_notes = itemUpdate.verification_notes;
          }
          await itemRecord.save();
        }
      }
    }

    // 2. Set Second Party User & Signature
    const secondPartyUserId = req.user ? req.user.id : null;
    let signatureUrl = second_party_signature;
    if (!signatureUrl && req.user) {
      const userObj = await User.findByPk(req.user.id);
      signatureUrl = userObj?.signature_url || null;
    }

    bast.second_party_user_id = secondPartyUserId;
    bast.second_party_title = second_party_title;
    if (signatureUrl) {
      bast.second_party_signature = signatureUrl;
    }
    bast.notes = notes !== undefined ? notes : bast.notes;
    bast.verified_at = new Date();

    if (overall_decision === 'Approved') {
      bast.status = 'Approved_SEA';
      bast.rejection_reason = null;
      await bast.save();

      // Unlock linked Service Orders for Technician Distribution
      const itemServiceOrderIds = (bast.items || []).map(i => i.service_order_id).filter(Boolean);
      const itemDeviceIds = (bast.items || []).map(i => i.device_id).filter(Boolean);

      let orderWhereClause = [];
      if (itemServiceOrderIds.length > 0) orderWhereClause.push({ id: itemServiceOrderIds });
      if (itemDeviceIds.length > 0) orderWhereClause.push({ device_id: itemDeviceIds });

      if (bast.bast_type === '1' && bast.intake_date) {
        const targetDate = bast.intake_date;
        const startOfDay = new Date(`${targetDate}T00:00:00.000Z`);
        const endOfDay = new Date(`${targetDate}T23:59:59.999Z`);
        orderWhereClause.push({ intake_date: { [Op.between]: [startOfDay, endOfDay] } });
        orderWhereClause.push({ created_at: { [Op.between]: [startOfDay, endOfDay] } });
      }

      if (orderWhereClause.length > 0) {
        await ServiceOrder.update(
          { bast_status: 'Approved_SEA' },
          { where: { [Op.or]: orderWhereClause } }
        );
      }
    } else {
      bast.status = 'Revision_Requested';
      bast.rejection_reason = rejection_reason || 'Diperlukan revisi data/fisik perangkat oleh Coordinator Arisa.';
      await bast.save();

      const itemServiceOrderIds = (bast.items || []).map(i => i.service_order_id).filter(Boolean);
      if (itemServiceOrderIds.length > 0) {
        await ServiceOrder.update(
          { bast_status: 'Revision_Requested' },
          { where: { id: itemServiceOrderIds } }
        );
      }
    }

    const updatedBast = await BastDocument.findByPk(id, {
      include: [
        {
          model: BastItem,
          as: 'items',
          include: [
            {
              model: ServiceOrder,
              as: 'serviceOrder',
              include: [{ model: Device, as: 'device' }, { model: Customer, as: 'customer' }]
            }
          ]
        },
        { model: User, as: 'firstPartyUser', attributes: ['id', 'full_name', 'email', 'role'] },
        { model: User, as: 'secondPartyUser', attributes: ['id', 'full_name', 'email', 'role'] },
        { model: Branch, as: 'branch' }
      ]
    });

    const actionMsg = overall_decision === 'Approved' 
      ? `BAST '${bast.bast_number}' BERHASIL DI-APPROVE oleh QC SEA! Distribusi fisik unit ke Teknisi telah ter-unlock.` 
      : `BAST '${bast.bast_number}' dikembalikan ke Coordinator Arisa untuk revisi.`;

    return res.status(200).json({
      success: true,
      message: actionMsg,
      data: updatedBast
    });
  } catch (error) {
    console.error('verifyBastBySea error:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal memproses verifikasi BAST oleh QC SEA.',
      error: error.message
    });
  }
};

/**
 * 5. Get History of BAST Documents
 */
const getBastHistory = async (req, res) => {
  try {
    const { bast_type, status, branch_id } = req.query;
    let whereClause = {};

    if (bast_type) whereClause.bast_type = bast_type;
    if (status) whereClause.status = status;
    if (branch_id) whereClause.branch_id = branch_id;

    const basts = await BastDocument.findAll({
      where: whereClause,
      include: [
        {
          model: BastItem,
          as: 'items',
          include: [
            {
              model: ServiceOrder,
              as: 'serviceOrder',
              include: [{ model: Device, as: 'device' }]
            }
          ]
        },
        { model: User, as: 'firstPartyUser', attributes: ['id', 'full_name', 'email', 'role'] },
        { model: User, as: 'secondPartyUser', attributes: ['id', 'full_name', 'email', 'role'] },
        { model: Branch, as: 'branch' }
      ],
      order: [['created_at', 'DESC']]
    });

    return res.status(200).json({
      success: true,
      data: basts
    });
  } catch (error) {
    console.error('getBastHistory error:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal mengambil riwayat BAST.',
      error: error.message
    });
  }
};

module.exports = {
  createBast,
  getPendingSeaBasts,
  getBastById,
  verifyBastBySea,
  getBastHistory
};
