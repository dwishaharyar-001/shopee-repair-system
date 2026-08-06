const bcrypt = require('bcryptjs');
const { User, RoleMenuAccess, Branch, Technician } = require('../models');

// Default initial permissions matrix for seed/fallback
const DEFAULT_PERMISSIONS = [
  // Dashboard
  { role: 'Admin', menu_key: 'dashboard', is_allowed: true },
  { role: 'Coordinator', menu_key: 'dashboard', is_allowed: true },
  { role: 'QA_Liaison', menu_key: 'dashboard', is_allowed: true },
  { role: 'Technician', menu_key: 'dashboard', is_allowed: true },

  // Devices Intake
  { role: 'Admin', menu_key: 'devices', is_allowed: true },
  { role: 'Coordinator', menu_key: 'devices', is_allowed: true },
  { role: 'QA_Liaison', menu_key: 'devices', is_allowed: true },
  { role: 'Technician', menu_key: 'devices', is_allowed: true },

  // Repair Queue
  { role: 'Admin', menu_key: 'repairs', is_allowed: true },
  { role: 'Coordinator', menu_key: 'repairs', is_allowed: true },
  { role: 'QA_Liaison', menu_key: 'repairs', is_allowed: false },
  { role: 'Technician', menu_key: 'repairs', is_allowed: true },

  // QC Checkpoints
  { role: 'Admin', menu_key: 'qc', is_allowed: true },
  { role: 'Coordinator', menu_key: 'qc', is_allowed: true },
  { role: 'QA_Liaison', menu_key: 'qc', is_allowed: true },
  { role: 'Technician', menu_key: 'qc', is_allowed: true },

  // Parts Inventory
  { role: 'Admin', menu_key: 'parts', is_allowed: true },
  { role: 'Coordinator', menu_key: 'parts', is_allowed: true },
  { role: 'QA_Liaison', menu_key: 'parts', is_allowed: false },
  { role: 'Technician', menu_key: 'parts', is_allowed: true },

  // KPI Reports
  { role: 'Admin', menu_key: 'reports', is_allowed: true },
  { role: 'Coordinator', menu_key: 'reports', is_allowed: true },
  { role: 'QA_Liaison', menu_key: 'reports', is_allowed: true },
  { role: 'Technician', menu_key: 'reports', is_allowed: false },

  // Admin & Users
  { role: 'Admin', menu_key: 'admin', is_allowed: true },
  { role: 'Coordinator', menu_key: 'admin', is_allowed: true },
  { role: 'QA_Liaison', menu_key: 'admin', is_allowed: false },
  { role: 'Technician', menu_key: 'admin', is_allowed: false },
];

/**
 * Ensure default permissions exist in DB
 */
const ensureDefaultPermissions = async () => {
  try {
    const count = await RoleMenuAccess.count();
    if (count === 0) {
      console.log('Seeding default role menu permissions...');
      for (const item of DEFAULT_PERMISSIONS) {
        await RoleMenuAccess.create({
          role: item.role,
          menu_key: item.menu_key,
          menu_label: item.menu_key.toUpperCase(),
          is_allowed: item.is_allowed
        });
      }
    }
  } catch (err) {
    console.error('Error ensuring default permissions:', err);
  }
};

/**
 * Get current user allowed menus
 */
const getMyPermissions = async (req, res) => {
  try {
    const userRole = req.user.role;

    // Admin has access to all menus
    if (userRole === 'Admin') {
      const allMenus = ['dashboard', 'devices', 'repairs', 'qc', 'parts', 'reports', 'admin'];
      return res.status(200).json({
        success: true,
        data: allMenus
      });
    }

    await ensureDefaultPermissions();

    const permissions = await RoleMenuAccess.findAll({
      where: { role: userRole, is_allowed: true }
    });

    const allowedMenus = permissions.map(p => p.menu_key);

    res.status(200).json({
      success: true,
      data: allowedMenus
    });
  } catch (error) {
    console.error('Error in getMyPermissions:', error);
    res.status(500).json({ success: false, message: 'Gagal mengambil hak akses menu.' });
  }
};

/**
 * Get full matrix of role menu permissions (For Admin Matrix page)
 */
const getAllPermissions = async (req, res) => {
  try {
    await ensureDefaultPermissions();

    const permissions = await RoleMenuAccess.findAll({
      order: [['role', 'ASC'], ['menu_key', 'ASC']]
    });

    const roles = ['Admin', 'Coordinator', 'QA_Liaison', 'Technician'];
    const menus = [
      { key: 'dashboard', label: 'Dashboard' },
      { key: 'devices', label: 'Devices Intake' },
      { key: 'repairs', label: 'Repair Queue' },
      { key: 'qc', label: 'QC Checkpoints' },
      { key: 'parts', label: 'Parts Inventory' },
      { key: 'reports', label: 'KPI Reports & BAST' },
      { key: 'admin', label: 'Admin & Users' }
    ];

    res.status(200).json({
      success: true,
      data: {
        roles,
        menus,
        permissions
      }
    });
  } catch (error) {
    console.error('Error in getAllPermissions:', error);
    res.status(500).json({ success: false, message: 'Gagal mengambil matriks hak akses.' });
  }
};

/**
 * Update role menu permissions matrix (Admin only)
 */
const updatePermissions = async (req, res) => {
  try {
    const { permissions } = req.body; // Array of { role, menu_key, is_allowed }

    if (!Array.isArray(permissions)) {
      return res.status(400).json({ success: false, message: 'Format data permissions tidak valid.' });
    }

    for (const item of permissions) {
      const { role, menu_key, is_allowed } = item;

      // Admin role always has full access
      const finalIsAllowed = role === 'Admin' ? true : Boolean(is_allowed);

      const existing = await RoleMenuAccess.findOne({
        where: { role, menu_key }
      });

      if (existing) {
        existing.is_allowed = finalIsAllowed;
        await existing.save();
      } else {
        const menuLabel = menu_key.toUpperCase();
        await RoleMenuAccess.create({
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
 * Get list of all users
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
 * Create New User (Admin & Coordinator)
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
      is_active: true,
      delete_status: 'none'
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
 * Update Existing User (Admin & Coordinator)
 */
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, email, role, branch_id, password, is_active, skill_level } = req.body;

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Pengguna tidak ditemukan.' });
    }

    // Protection for Admin role
    if (user.role === 'Admin' && is_active === false) {
      return res.status(400).json({
        success: false,
        message: 'Akun Admin Aplikasi dilindungi dan tidak dapat dinonaktifkan.'
      });
    }

    if (full_name) user.full_name = full_name.trim();
    if (email !== undefined) user.email = email ? email.trim() : null;
    if (role) user.role = role;

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
 * Toggle Active Status User
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
        message: 'Akun Admin Aplikasi dilindungi dan tidak dapat dinonaktifkan.'
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
 * Request Delete User (Coordinator or Admin) -> sets delete_status = 'pending_delete'
 */
const requestDeleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByPk(id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'Pengguna tidak ditemukan.' });
    }

    if (user.role === 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Akun Admin Aplikasi dilindungi dan tidak dapat dihapus.'
      });
    }

    user.delete_status = 'pending_delete';
    await user.save();

    return res.status(200).json({
      success: true,
      message: `Pengajuan hapus user '${user.full_name}' (@${user.username}) berhasil. Status berubah menjadi 'pending delete' menunggu persetujuan System Administrator.`,
      data: user
    });
  } catch (error) {
    console.error('Error in requestDeleteUser:', error);
    return res.status(500).json({ success: false, message: 'Gagal mengajukan hapus user.' });
  }
};

/**
 * Approve Delete User (System Administrator / Admin ONLY) -> permanently destroys user
 */
const approveDeleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByPk(id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'Pengguna tidak ditemukan.' });
    }

    if (req.user.role !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Hanya System Administrator yang berhak menyetujui penghapusan pengguna.'
      });
    }

    const userName = user.full_name;
    const username = user.username;
    
    // Destroy associated Technician profile if exists
    await Technician.destroy({ where: { user_id: user.id } });
    await user.destroy();

    return res.status(200).json({
      success: true,
      message: `Pengajuan hapus disetujui. Akun user '${userName}' (@${username}) telah dihapus secara permanen dari sistem.`
    });
  } catch (error) {
    console.error('Error in approveDeleteUser:', error);
    return res.status(500).json({ success: false, message: 'Gagal menyetujui hapus user.' });
  }
};

/**
 * Reject Delete User (System Administrator / Admin ONLY) -> resets delete_status = 'none'
 */
const rejectDeleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByPk(id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'Pengguna tidak ditemukan.' });
    }

    if (req.user.role !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Hanya System Administrator yang berhak menolak pengajuan hapus.'
      });
    }

    user.delete_status = 'none';
    await user.save();

    return res.status(200).json({
      success: true,
      message: `Pengajuan hapus user '${user.full_name}' ditolak. Status user dikembalikan ke normal.`,
      data: user
    });
  } catch (error) {
    console.error('Error in rejectDeleteUser:', error);
    return res.status(500).json({ success: false, message: 'Gagal menolak pengajuan hapus user.' });
  }
};

/**
 * Assign / Update User Branch Location
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
  requestDeleteUser,
  approveDeleteUser,
  rejectDeleteUser,
  updateUserBranch,
  ensureDefaultPermissions
};
