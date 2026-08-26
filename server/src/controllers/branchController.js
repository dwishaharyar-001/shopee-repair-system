const { sequelize, Branch, BranchCategoryPrice } = require('../models');

const DEFAULT_REPAIR_CATEGORIES = [
  { name: 'General Diagnostics Fee', price: 50000 },
  { name: 'Physical Condition (Casing dan Engsel)', price: 150000 },
  { name: 'Display (Layar dan Touchscreen)', price: 350000 },
  { name: 'Storage & Power (Baterai dan HDD/SSD)', price: 200000 },
  { name: 'Input Device (Keyboard dan Touchpad)', price: 175000 },
  { name: 'Connectivity Port (Port USB, Port Jack Audio, Port HDMI, Port Charger)', price: 125000 },
  { name: 'Audio Visual (Speaker, Microphone, dan Kamera)', price: 150000 },
  { name: 'Wireless Connectivity (Bluetooth dan WiFi)', price: 125000 }
];

/**
 * Seed initial default branch locations if table is empty
 */
const ensureDefaultBranches = async () => {
  try {
    const count = await Branch.count();
    if (count === 0) {
      await Branch.bulkCreate([
        {
          name: 'Jakarta Central Hub',
          code: 'JKT',
          address: 'Jl. Jend. Sudirman No. 45, Jakarta Selatan',
          is_active: true
        },
        {
          name: 'Bandung Hub',
          code: 'BDG',
          address: 'Jl. Asia Afrika No. 12, Bandung',
          is_active: true
        },
        {
          name: 'Surabaya Hub',
          code: 'SUB',
          address: 'Jl. Pemuda No. 88, Surabaya',
          is_active: true
        }
      ]);
      console.log('✅ Seeded default branch locations (JKT, BDG, SUB).');
    }
  } catch (err) {
    console.error('Error ensuring default branches:', err);
  }
};

const ensureDefaultBranchCategoryPrices = async () => {
  try {
    const branches = await Branch.findAll();
    for (const b of branches) {
      for (const cat of DEFAULT_REPAIR_CATEGORIES) {
        await BranchCategoryPrice.findOrCreate({
          where: { branch_id: b.id, category_name: cat.name },
          defaults: { price: cat.price }
        });
      }
    }
  } catch (err) {
    console.error('Error ensuring branch repair prices:', err.message);
  }
};

/**
 * Get active branches (for dropdown selection in Intake / Filter)
 */
const getBranches = async (req, res) => {
  try {
    await ensureDefaultBranches();
    const branches = await Branch.findAll({
      where: { is_active: true },
      order: [['name', 'ASC']]
    });

    let priceMap = {};
    try {
      const customPrices = await BranchCategoryPrice.findAll({
        where: { category_name: 'General Diagnostics Fee' }
      });
      customPrices.forEach(cp => {
        priceMap[cp.branch_id] = parseFloat(cp.price) || 30000;
      });
    } catch (e) {}

    const data = branches.map(b => {
      const raw = b.toJSON ? b.toJSON() : b;
      return {
        ...raw,
        diagnostic_fee: priceMap[raw.id] !== undefined ? priceMap[raw.id] : 30000
      };
    });

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Error in getBranches:', error);
    return res.status(500).json({ success: false, message: 'Gagal mengambil daftar lokasi cabang.' });
  }
};

/**
 * Get all branches including inactive (for Admin Master Configuration)
 */
const getAllBranches = async (req, res) => {
  try {
    await ensureDefaultBranches();
    const branches = await Branch.findAll({
      order: [['id', 'ASC']]
    });

    let priceMap = {};
    try {
      const customPrices = await BranchCategoryPrice.findAll({
        where: { category_name: 'General Diagnostics Fee' }
      });
      customPrices.forEach(cp => {
        priceMap[cp.branch_id] = parseFloat(cp.price) || 30000;
      });
    } catch (e) {}

    const data = branches.map(b => {
      const raw = b.toJSON ? b.toJSON() : b;
      return {
        ...raw,
        diagnostic_fee: priceMap[raw.id] !== undefined ? priceMap[raw.id] : 30000
      };
    });

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Error in getAllBranches:', error);
    return res.status(500).json({ success: false, message: 'Gagal mengambil data master cabang.' });
  }
};

/**
 * Create new Branch (Admin only)
 */
const createBranch = async (req, res) => {
  try {
    const { name, code, address } = req.body;

    if (!name || !code) {
      return res.status(400).json({
        success: false,
        message: 'Nama cabang dan Kode cabang (3 huruf) wajib diisi.'
      });
    }

    const formattedCode = code.trim().toUpperCase();

    if (formattedCode.length < 2 || formattedCode.length > 10) {
      return res.status(400).json({
        success: false,
        message: 'Kode cabang harus berdurasi antara 2 hingga 10 karakter (Contoh: JKT, BDG, SUB).'
      });
    }

    // Check code uniqueness
    const existing = await Branch.findOne({ where: { code: formattedCode } });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Kode cabang '${formattedCode}' sudah digunakan oleh cabang '${existing.name}'.`
      });
    }

    // Fix PostgreSQL sequence if needed
    if (sequelize.getDialect() === 'postgres') {
      try {
        await sequelize.query(`SELECT setval(pg_get_serial_sequence('branches', 'id'), COALESCE(max(id), 1)) FROM branches;`);
      } catch (seqErr) {}
    }

    const branch = await Branch.create({
      name: name.trim(),
      code: formattedCode,
      address: address ? address.trim() : null,
      is_active: true
    });

    return res.status(201).json({
      success: true,
      message: `Cabang '${branch.name}' (${branch.code}) berhasil ditambahkan.`,
      data: branch
    });
  } catch (error) {
    console.error('Error in createBranch:', error);
    return res.status(500).json({ success: false, message: 'Gagal menambah cabang baru.', error: error.message });
  }
};

/**
 * Update Branch (Admin only)
 */
const updateBranch = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code, address, is_active } = req.body;

    const branch = await Branch.findByPk(id);
    if (!branch) {
      return res.status(404).json({ success: false, message: 'Lokasi cabang tidak ditemukan.' });
    }

    if (code) {
      const formattedCode = code.trim().toUpperCase();
      if (formattedCode !== branch.code) {
        const existing = await Branch.findOne({ where: { code: formattedCode } });
        if (existing) {
          return res.status(400).json({
            success: false,
            message: `Kode cabang '${formattedCode}' sudah digunakan.`
          });
        }
        branch.code = formattedCode;
      }
    }

    if (name) branch.name = name.trim();
    if (address !== undefined) branch.address = address ? address.trim() : null;
    if (typeof is_active === 'boolean') branch.is_active = is_active;

    await branch.save();

    return res.status(200).json({
      success: true,
      message: `Data cabang '${branch.name}' berhasil diperbarui.`,
      data: branch
    });
  } catch (error) {
    console.error('Error in updateBranch:', error);
    return res.status(500).json({ success: false, message: 'Gagal memperbarui data cabang.', error: error.message });
  }
};

/**
 * Toggle Active Status / Delete Branch (Admin only)
 */
const deleteBranch = async (req, res) => {
  try {
    const { id } = req.params;
    const branch = await Branch.findByPk(id);
    if (!branch) {
      return res.status(404).json({ success: false, message: 'Lokasi cabang tidak ditemukan.' });
    }

    branch.is_active = !branch.is_active;
    await branch.save();

    return res.status(200).json({
      success: true,
      message: `Status cabang '${branch.name}' diubah menjadi ${branch.is_active ? 'Aktif' : 'Non-aktif'}.`,
      data: branch
    });
  } catch (error) {
    console.error('Error in deleteBranch:', error);
    return res.status(500).json({ success: false, message: 'Gagal mengubah status cabang.', error: error.message });
  }
};
/**
 * Get Branch Category Prices (All or filtered by branch_id)
 */
const getBranchCategoryPrices = async (req, res) => {
  try {
    await ensureDefaultBranches();
    await ensureDefaultBranchCategoryPrices();

    const { branch_id } = req.query;
    let whereClause = {};
    if (branch_id) whereClause.branch_id = branch_id;

    const prices = await BranchCategoryPrice.findAll({
      where: whereClause,
      include: [{ model: Branch, as: 'branch', attributes: ['id', 'name', 'code'] }],
      order: [['branch_id', 'ASC'], ['id', 'ASC']]
    });

    return res.status(200).json({ success: true, data: prices });
  } catch (error) {
    console.error('Error in getBranchCategoryPrices:', error);
    return res.status(500).json({ success: false, message: 'Gagal mengambil data harga perbaikan per cabang.' });
  }
};

/**
 * Bulk Update Branch Category Prices (Admin only)
 */
const updateBranchCategoryPrices = async (req, res) => {
  try {
    const { branchId } = req.params;
    const { prices } = req.body;

    if (!Array.isArray(prices)) {
      return res.status(400).json({ success: false, message: 'Format data harga tidak valid.' });
    }

    const branch = await Branch.findByPk(branchId);
    if (!branch) {
      return res.status(404).json({ success: false, message: 'Cabang tidak ditemukan.' });
    }

    for (const item of prices) {
      if (item.category_name && item.price !== undefined) {
        let rec = await BranchCategoryPrice.findOne({
          where: { branch_id: branchId, category_name: item.category_name }
        });
        if (rec) {
          rec.price = parseFloat(item.price) || 0;
          await rec.save();
        } else {
          await BranchCategoryPrice.create({
            branch_id: branchId,
            category_name: item.category_name,
            price: parseFloat(item.price) || 0
          });
        }
      }
    }

    const updatedPrices = await BranchCategoryPrice.findAll({
      where: { branch_id: branchId },
      include: [{ model: Branch, as: 'branch', attributes: ['id', 'name', 'code'] }]
    });

    return res.status(200).json({
      success: true,
      message: `Harga perbaikan per cabang '${branch.name}' (${branch.code}) berhasil diperbarui.`,
      data: updatedPrices
    });
  } catch (error) {
    console.error('Error in updateBranchCategoryPrices:', error);
    return res.status(500).json({ success: false, message: 'Gagal memperbarui harga perbaikan cabang.', error: error.message });
  }
};

/**
 * Update Branch Diagnostic Fee (Admin only)
 */
const updateBranchDiagnosticFee = async (req, res) => {
  try {
    const { id } = req.params;
    const { diagnostic_fee } = req.body;

    const parsedFee = parseInt(diagnostic_fee, 10);
    if (isNaN(parsedFee) || parsedFee < 0) {
      return res.status(400).json({
        success: false,
        message: 'Nominal tarif diagnostic fee harus berupa angka positif.'
      });
    }

    const branch = await Branch.findByPk(id);
    if (!branch) {
      return res.status(404).json({ success: false, message: 'Lokasi cabang tidak ditemukan.' });
    }

    // Upsert into BranchCategoryPrice
    const [catPrice] = await BranchCategoryPrice.findOrCreate({
      where: { branch_id: id, category_name: 'General Diagnostics Fee' },
      defaults: { price: parsedFee }
    });
    catPrice.price = parsedFee;
    await catPrice.save();

    return res.status(200).json({
      success: true,
      message: `Tarif General Diagnostics untuk cabang '${branch.name}' berhasil diubah menjadi Rp ${parsedFee.toLocaleString('id-ID')}.`,
      data: {
        id: branch.id,
        name: branch.name,
        code: branch.code,
        diagnostic_fee: parsedFee
      }
    });
  } catch (error) {
    console.error('Error in updateBranchDiagnosticFee:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal memperbarui tarif diagnostik cabang.',
      error: error.message
    });
  }
};

module.exports = {
  getBranches,
  getAllBranches,
  createBranch,
  updateBranch,
  deleteBranch,
  getBranchCategoryPrices,
  updateBranchCategoryPrices,
  updateBranchDiagnosticFee,
  ensureDefaultBranches
};
