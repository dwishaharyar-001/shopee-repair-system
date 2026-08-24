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
  return `BAST/${typeCode}/${year}/${month}/${String(count + 1).padStart(3, '0')}`;
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

    // Get First Party user details
    const firstPartyUserId = req.user ? req.user.id : 1;
    let signatureUrl = first_party_signature;
    if (!signatureUrl && req.user) {
      const userObj = await User.findByPk(req.user.id);
      signatureUrl = userObj?.signature_url || null;
    }

    // Check if BAST Document already exists for this bast_number (Upsert handling)
    let bastDoc = await BastDocument.findOne({ where: { bast_number: docNumber } });

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
    const { branch_id } = req.query;
    let whereClause = { status: 'Submitted_to_SEA' };

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
      second_party_title = 'Asset PIC / QC - Shopee',
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
      const itemServiceOrderIds = bast.items.map(i => i.service_order_id);
      await ServiceOrder.update(
        { bast_status: 'Approved_SEA' },
        { where: { id: itemServiceOrderIds } }
      );
    } else {
      bast.status = 'Revision_Requested';
      bast.rejection_reason = rejection_reason || 'Diperlukan revisi data/fisik perangkat oleh Coordinator Arisa.';
      await bast.save();

      // Update Service Orders back to Revision_Requested
      const itemServiceOrderIds = bast.items.map(i => i.service_order_id);
      await ServiceOrder.update(
        { bast_status: 'Revision_Requested' },
        { where: { id: itemServiceOrderIds } }
      );
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
