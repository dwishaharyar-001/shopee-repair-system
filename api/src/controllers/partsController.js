const { Op } = require('sequelize');
const { Part, HarvestLog, Device, User, PartConsumed, ServiceOrder, Branch } = require('../models');

// Helper to generate Harvest code
const generateHarvestCode = (num) => {
  return `HARV-${new Date().getFullYear()}-${String(num).padStart(4, '0')}`;
};

// 1. Get Inventory Parts List with Search, Category, and Branch Filters
const getInventoryParts = async (req, res) => {
  try {
    const { search, category, low_stock, branch_id } = req.query;

    let whereClause = {};
    if (category) {
      whereClause.category = category;
    }

    if (branch_id) {
      whereClause.branch_id = branch_id;
    }

    if (search) {
      whereClause[Op.or] = [
        { part_number: { [Op.like]: `%${search}%` } },
        { name: { [Op.like]: `%${search}%` } },
        { category: { [Op.like]: `%${search}%` } }
      ];
    }

    let parts = await Part.findAll({
      where: whereClause,
      include: [{ model: Branch, as: 'branch', attributes: ['id', 'name', 'code'] }],
      order: [['category', 'ASC'], ['name', 'ASC']]
    });

    if (low_stock === 'true') {
      parts = parts.filter(p => p.stock_quantity <= p.min_stock_trigger);
    }

    return res.status(200).json({ success: true, data: parts });
  } catch (error) {
    console.error('getInventoryParts error:', error);
    return res.status(500).json({ success: false, message: 'Gagal mengambil data stok inventaris.', error: error.message });
  }
};

// 2. Create New Spare Part in Catalog (Assigned to Branch)
const createPart = async (req, res) => {
  try {
    const { part_number, name, category, stock_quantity, unit_cost, min_stock_trigger, branch_id } = req.body;

    if (!part_number || !name || !category) {
      return res.status(400).json({ success: false, message: 'Mohon lengkapi Nomor Part, Nama Part, dan Kategori.' });
    }

    const existing = await Part.findOne({ where: { part_number: part_number.trim() } });
    if (existing) {
      return res.status(400).json({ success: false, message: `Nomor part '${part_number}' sudah terdaftar di katalog!` });
    }

    let targetBranchId = branch_id || null;
    if (!targetBranchId) {
      const defaultBranch = await Branch.findOne({ where: { is_active: true }, order: [['id', 'ASC']] });
      if (defaultBranch) targetBranchId = defaultBranch.id;
    }

    const part = await Part.create({
      part_number: part_number.trim(),
      name: name.trim(),
      category: category.trim(),
      stock_quantity: parseInt(stock_quantity) || 0,
      unit_cost: parseFloat(unit_cost) || 0.00,
      min_stock_trigger: parseInt(min_stock_trigger) || 5,
      branch_id: targetBranchId
    });

    const fullPart = await Part.findByPk(part.id, {
      include: [{ model: Branch, as: 'branch' }]
    });

    return res.status(201).json({
      success: true,
      message: `Spare part baru '${part.name}' (${part.part_number}) berhasil ditambahkan.`,
      data: fullPart
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Gagal menambahkan spare part baru.', error: error.message });
  }
};

// 3. Update Existing Spare Part
const updatePart = async (req, res) => {
  try {
    const { id } = req.params;
    const { stock_quantity, unit_cost, min_stock_trigger, name, category, branch_id } = req.body;

    const part = await Part.findByPk(id);
    if (!part) {
      return res.status(404).json({ success: false, message: 'Spare part tidak ditemukan.' });
    }

    if (name) part.name = name;
    if (category) part.category = category;
    if (stock_quantity !== undefined) part.stock_quantity = parseInt(stock_quantity);
    if (unit_cost !== undefined) part.unit_cost = parseFloat(unit_cost);
    if (min_stock_trigger !== undefined) part.min_stock_trigger = parseInt(min_stock_trigger);
    if (branch_id !== undefined) part.branch_id = branch_id || null;

    await part.save();

    const updatedPart = await Part.findByPk(id, {
      include: [{ model: Branch, as: 'branch' }]
    });

    return res.status(200).json({
      success: true,
      message: `Data spare part '${part.name}' berhasil diperbarui.`,
      data: updatedPart
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Gagal memperbarui data spare part.', error: error.message });
  }
};

// 4. Harvest Part from Cannibalized Device
const harvestPart = async (req, res) => {
  try {
    const { source_device_id, part_id, quantity, condition, notes } = req.body;

    if (!source_device_id || !part_id || !quantity || quantity <= 0) {
      return res.status(400).json({ success: false, message: 'Pilih perangkat sumber, spare part, dan kuantitas hasil panen.' });
    }

    const device = await Device.findByPk(source_device_id);
    if (!device) {
      return res.status(404).json({ success: false, message: 'Perangkat sumber tidak ditemukan.' });
    }

    const part = await Part.findByPk(part_id);
    if (!part) {
      return res.status(404).json({ success: false, message: 'Spare part tidak ditemukan.' });
    }

    // Increase part stock quantity
    const addQty = parseInt(quantity);
    part.stock_quantity += addQty;
    await part.save();

    const count = await HarvestLog.count();
    const harvestCode = generateHarvestCode(count + 1);

    const harvestLog = await HarvestLog.create({
      harvest_code: harvestCode,
      source_device_id,
      part_id,
      quantity: addQty,
      condition: condition || 'Tested Good',
      harvested_by_user_id: req.user ? req.user.id : null,
      notes: notes || `Pemanenan dari unit ${device.device_id} (${device.brand} ${device.model})`
    });

    return res.status(201).json({
      success: true,
      message: `Pemanenan ${addQty}x '${part.name}' dari unit '${device.device_id}' berhasil! Stok baru: ${part.stock_quantity}.`,
      data: harvestLog
    });
  } catch (error) {
    console.error('harvestPart error:', error);
    return res.status(500).json({ success: false, message: 'Gagal memproses pemananen part.', error: error.message });
  }
};

// 5. Get Harvest Audit Logs
const getHarvestLogs = async (req, res) => {
  try {
    const logs = await HarvestLog.findAll({
      include: [
        { model: Device, as: 'sourceDevice' },
        { model: Part, as: 'part', include: [{ model: Branch, as: 'branch' }] },
        { model: User, as: 'harvestedBy', attributes: ['id', 'full_name'] }
      ],
      order: [['created_at', 'DESC']]
    });

    return res.status(200).json({ success: true, data: logs });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Gagal mengambil log pemananen part.', error: error.message });
  }
};

// 6. Get Inventory Analytics & Valuation Metrics
const getInventoryMetrics = async (req, res) => {
  try {
    const { branch_id } = req.query;
    let whereClause = {};
    if (branch_id) whereClause.branch_id = branch_id;

    const allParts = await Part.findAll({ where: whereClause });
    
    let totalValuation = 0;
    let lowStockCount = 0;

    allParts.forEach(p => {
      totalValuation += (p.stock_quantity * parseFloat(p.unit_cost || 0));
      if (p.stock_quantity <= p.min_stock_trigger) {
        lowStockCount++;
      }
    });

    const totalHarvestedCount = await HarvestLog.count();
    const totalConsumedCount = await PartConsumed.count();

    return res.status(200).json({
      success: true,
      data: {
        totalSKU: allParts.length,
        totalValuation,
        lowStockCount,
        totalHarvestedCount,
        totalConsumedCount
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Gagal mengambil metrik inventaris.', error: error.message });
  }
};

module.exports = {
  getInventoryParts,
  createPart,
  updatePart,
  harvestPart,
  getHarvestLogs,
  getInventoryMetrics
};
