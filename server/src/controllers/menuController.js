const bcrypt = require('bcryptjs');
const { RoleMenuAccess, User, Branch, Technician } = require('../models');

const ALL_ROLES = ['Admin', 'Coordinator', 'QA_Liaison', 'Technician'];
const DEFAULT_MENUS = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'devices', label: 'Devices Intake' },
  { key: 'repairs', label: 'Repair Queue' },
  { key: 'qc', label: 'QC Checkpoints' },
  { key: 'parts', label: 'Parts Inventory' },
  { key: 'reports', label: 'KPI Reports' },
  { key: 'admin', label: 'Admin & Users' }
];

// Initial default access matrix
const DEFAULT_ACCESS_MATRIX = {
  Admin: ['dashboard', 'devices', 'repairs', 'qc', 'parts', 'reports', 'admin'],
  Coordinator: ['dashboard', 'devices', 'repairs', 'qc', 'parts', 'reports', 'admin'],
  QA_Liaison: ['dashboard', 'devices', 'qc', 'reports'],
  Technician: ['dashboard', 'devices', 'repairs', 'qc', 'parts']
};

/**
  Helper to seed default menu permission records if empty or missing
 */
const ensureDefaultPermissions = async () => {
  try {
    const count = await RoleMenuAccess.count();
    if (count === 0) {
      const recordsToCreate = [];
      for (const role of ALL_ROLES) {
        const allowedKeys = DEFAULT_ACCESS_MATRIX[role] || [];
        for (const menu of DEFAULT_MENUS) {
          recordsToCreate.push({
            role,
            menu_key: menu.key,
            menu_label: menu.label,
            is_allowed: allowedKeys.includes(menu.key)
          });
        }
      }
      await RoleMenuAccess.bulkCreate(recordsToCreate);
      console.log('✅ Seeded default role menu access permissions.');
    }
  } catch (err) {
    console.error('Error ensuring default permissions:', err);
  }
};

/**
 * Get all role menu access permissions (Matrix structure for Admin)
 */
const getAllPermissions = async (req, res) => {
  try {
    await ensureDefaultPermissions();
    const permissions = await RoleMenuAccess.findAll({
      order: [['role', 'ASC'], ['id', 'ASC']]
    });

    res.status(200).json({
      success: true,
      data: {
        roles: ALL_ROLES,
        menus: DEFAULT_MENUS,
        permissions
      }
    });
  } catch (error) {
    console.error('Error in getAllPermissions:', error);
    res.status(500).json({ success: false, message: 'Gagal mengambil data hak akses menu.' });
  }
};

/**
 * Get allowed menu keys for the current authenticated user's role
 */
const getMyPermissions = async (req, res) => {
  try {
    await ensureDefaultPermissions();
    const userRole = req.user.role;

    // Admin Application ALWAYS gets 100% full rights to all menus
    if (userRole === 'Admin') {
      return res.status(200).json({
        success: true,
        data: {
          role: userRole,
          allowedMenus: DEFAULT_MENUS.map(m => m.key)
        }
      });
    }

    const accessRecords = await RoleMenuAccess.findAll({
      where: {
        role: userRole,
        is_allowed: true
      }
    });

    const allowedMenus = accessRecords.map(rec => rec.menu_key);

    res.status(200).json({
      success: true,
      data: {
        role: userRole,
        allowedMenus
      }
    });
  } catch (error) {
    console.error('Error in getMyPermissions:', error);
    res.status(500).json({ success: false, message: 'Gagal mengambil hak akses menu pengguna.' });
  }
};

/**
 * Update role menu access permissions (Admin only)
 */
const updatePermissions = async (req, res) => {
  try {
    const { permissions } = req.body; // Array of { role, menu_key, is_allowed }

    if (!Array.isArray(permissions)) {
      return res.status(400).json({
        success: false,
        message: 'Format payload tidak valid. Harap kirimkan array permissions.'
      });
    }

    for (const item of permissions) {
      const { role, menu_key, is_allowed } = item;
      if (role && menu_key && typeof is_allowed === 'boolean') {
        const menuObj = DEFAULT_MENUS.find(m => m.key === menu_key);
        const menuLabel = menuObj ? menuObj.label : menu_key;

        // Admin role ALWAYS remains enabled for all menus
        const finalIsAllowed = role === 'Admin' ? true : is_allowed;

        await RoleMenuAccess.upsert({
          role,
          menu_key,
          menu_label: menuLabel,
          is_allowed: finalIsAllowed
        });
      }
    }

    res.status(200).json({
      success: true,
      message: 'Konfigurasi hak akses menu berhasil diperbarui.'
    });
  } catch (error) {
    console.error('Error in updatePermissions:', error);
    res.status(500).json({ success: false, message: 'Gagal memperbarui hak akses menu.' });
  }
};

/**
 * Get list of all users (for Admin User Management tab)
 */
const getAllUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: { exclude: ['password_hash'] },
      include: [
        { model: Branch, as: 'branch', attributes: ['id', 'name', 'code'] },
        { model: Technician, as: 'technicianProfile', required: false }
      ],
      order: [['id', 'ASC']]
    });

    res.status(200).json({
      success: true,
      data: users
    });
  } catch (error) {
    console.error('Error in getAllUsers:', error);
    res.status(500).json({ success: false, message: 'Gagal mengambil data user.' });
  }
};

/**
 * Create New User (Admin only)
 */
const createUser = async (req, res) => {
  try {
    const { username, password, full_name, email, role, branch_id, skill_level } = req.body;

    if (!username || !password || !full_name || !role) {
      return res.status(400).json({
        success: false,
        message: 'Username, password, nama lengkap, dan role wajib diisi.'
      });
    }

    const formattedUsername = username.trim().toLowerCase();
    const existing = await User.findOne({ where: { username: formattedUsername } });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Username '@${formattedUsername}' sudah terdaftar dalam sistem.`
      });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const targetBranchId = role === 'Admin' ? null : (branch_id ? parseInt(branch_id) : null);

    const newUser = await User.create({
      username: formattedUsername,
      password_hash,
      full_name: full_name.trim(),
      email: email ? email.trim() : null,
      role,
      branch_id: targetBranchId,
      is_active: true
    });

    // Auto create Technician profile if role is Technician
    if (role === 'Technician') {
      const techCount = await Technician.count();
      const empCode = `TECH-${String(techCount + 1).padStart(3, '0')}`;
      await Technician.create({
        user_id: newUser.id,
        employee_code: empCode,
        skill_level: skill_level || 'General Hardware Specialist',
        status: 'Available'
      });
    }

    const fullUser = await User.findByPk(newUser.id, {
      attributes: { exclude: ['password_hash'] },
      include: [
        { model: Branch, as: 'branch' },
        { model: Technician, as: 'technicianProfile' }
      ]
    });

    return res.status(201).json({
      success: true,
      message: `User baru '${newUser.full_name}' (@${newUser.username}) berhasil ditambahkan.`,
      data: fullUser
    });
  } catch (error) {
    console.error('Error in createUser:', error);
    return res.status(500).json({ success: false, message: 'Gagal membuat user baru.', error: error.message });
  }
};

/**
 * Update Existing User (Admin only)
 */
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, email, role, branch_id, password, is_active, skill_level } = req.body;

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Pengguna tidak ditemukan.' });
    }

    // Protection for Admin role / master admin account
    if (user.role === 'Admin' && is_active === false) {
      return res.status(400).json({
        success: false,
        message: 'Akun Admin Aplikasi dilindungi dan tidak dapat dinonaktifkan.'
      });
    }

    if (full_name) user.full_name = full_name.trim();
    if (email !== undefined) user.email = email ? email.trim() : null;
    if (role) user.role = role;

    // Admin role ALWAYS gets global branch access (branch_id = null)
    if (user.role === 'Admin') {
      user.branch_id = null;
    } else if (branch_id !== undefined) {
      user.branch_id = branch_id ? parseInt(branch_id) : null;
    }

    if (typeof is_active === 'boolean' && user.role !== 'Admin') {
      user.is_active = is_active;
    }

    if (password && password.trim().length > 0) {
      user.password_hash = await bcrypt.hash(password.trim(), 10);
    }

    await user.save();

    // If role is Technician, ensure Technician profile exists
    if (user.role === 'Technician') {
      let techProfile = await Technician.findOne({ where: { user_id: user.id } });
      if (!techProfile) {
        const techCount = await Technician.count();
        const empCode = `TECH-${String(techCount + 1).padStart(3, '0')}`;
        await Technician.create({
          user_id: user.id,
          employee_code: empCode,
          skill_level: skill_level || 'General Hardware Specialist',
          status: 'Available'
        });
      } else if (skill_level) {
        techProfile.skill_level = skill_level;
        await techProfile.save();
      }
    }

    const updatedUser = await User.findByPk(id, {
      attributes: { exclude: ['password_hash'] },
      include: [
        { model: Branch, as: 'branch' },
        { model: Technician, as: 'technicianProfile' }
      ]
    });

    return res.status(200).json({
      success: true,
      message: `Data pengguna '${user.full_name}' berhasil diperbarui.`,
      data: updatedUser
    });
  } catch (error) {
    console.error('Error in updateUser:', error);
    return res.status(500).json({ success: false, message: 'Gagal memperbarui data pengguna.', error: error.message });
  }
};

/**
 * Toggle Active Status / Delete User (Admin only)
 */
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByPk(id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'Pengguna tidak ditemukan.' });
    }

    if (user.role === 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Akun Admin Aplikasi dilindungi dan tidak dapat dihapus atau dinonaktifkan.'
      });
    }

    user.is_active = !user.is_active;
    await user.save();

    return res.status(200).json({
      success: true,
      message: `Status akun '${user.full_name}' diubah menjadi ${user.is_active ? 'Aktif' : 'Non-aktif'}.`,
      data: user
    });
  } catch (error) {
    console.error('Error in deleteUser:', error);
    return res.status(500).json({ success: false, message: 'Gagal mengubah status akun pengguna.' });
  }
};

/**
 * Assign / Update User Branch Location (Admin only)
 */
const updateUserBranch = async (req, res) => {
  try {
    const { id } = req.params;
    const { branch_id } = req.body;

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Pengguna tidak ditemukan.' });
    }

    if (user.role === 'Admin') {
      user.branch_id = null;
    } else if (branch_id) {
      const branch = await Branch.findByPk(branch_id);
      if (!branch) {
        return res.status(400).json({ success: false, message: 'Lokasi cabang tidak valid.' });
      }
      user.branch_id = branch.id;
    } else {
      user.branch_id = null;
    }

    await user.save();

    const updatedUser = await User.findByPk(id, {
      attributes: { exclude: ['password_hash'] },
      include: [{ model: Branch, as: 'branch' }]
    });

    return res.status(200).json({
      success: true,
      message: `Penempatan cabang untuk '${user.full_name}' berhasil diperbarui.`,
      data: updatedUser
    });
  } catch (error) {
    console.error('Error in updateUserBranch:', error);
    return res.status(500).json({ success: false, message: 'Gagal memperbarui cabang pengguna.' });
  }
};

module.exports = {
  getAllPermissions,
  getMyPermissions,
  updatePermissions,
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
  updateUserBranch,
  ensureDefaultPermissions
};
