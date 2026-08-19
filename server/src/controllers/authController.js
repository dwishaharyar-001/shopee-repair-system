const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, Technician, Branch } = require('../models');

const branchAttributes = ['id', 'name', 'code', 'address', 'is_active'];

const login = async (req, res) => {
  try {
    const { username, password } = req.body || {};

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username dan password wajib diisi.'
      });
    }

    const user = await User.findOne({
      where: { username },
      include: [
        { model: Technician, as: 'technicianProfile', required: false },
        { model: Branch, as: 'branch', required: false, attributes: branchAttributes }
      ]
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Username atau password tidak valid.'
      });
    }

    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: 'Akun Anda dinonaktifkan. Silakan hubungi Administrator.'
      });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Username atau password tidak valid.'
      });
    }

    const secret = process.env.JWT_SECRET || 'shopee_asset_repair_super_secret_jwt_key_2026';
    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        role: user.role,
        branch_id: user.branch_id
      },
      secret,
      { expiresIn: '24h' }
    );

    const rawUser = user.toJSON ? user.toJSON() : user;
    const cleanUser = {
      id: rawUser.id,
      username: rawUser.username,
      full_name: rawUser.full_name,
      email: rawUser.email,
      role: rawUser.role,
      branch_id: rawUser.branch_id,
      branch: rawUser.branch || null,
      technician: rawUser.technicianProfile || null,
      signature_url: rawUser.signature_url || null,
      delete_status: rawUser.delete_status || 'none',
      qc_affiliation: rawUser.qc_affiliation || 'Arisa'
    };

    return res.status(200).json({
      success: true,
      message: 'Login berhasil.',
      data: {
        token,
        user: cleanUser
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan pada server saat login.',
      error: error.message
    });
  }
};

const getMe = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password_hash'] },
      include: [
        { model: Technician, as: 'technicianProfile', required: false },
        { model: Branch, as: 'branch', required: false, attributes: branchAttributes }
      ]
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User tidak ditemukan.' });
    }

    const rawUser = user.toJSON ? user.toJSON() : user;
    const cleanUser = {
      id: rawUser.id,
      username: rawUser.username,
      full_name: rawUser.full_name,
      email: rawUser.email,
      role: rawUser.role,
      branch_id: rawUser.branch_id,
      branch: rawUser.branch || null,
      technician: rawUser.technicianProfile || null,
      signature_url: rawUser.signature_url || null,
      delete_status: rawUser.delete_status || 'none',
      qc_affiliation: rawUser.qc_affiliation || 'Arisa'
    };

    return res.status(200).json({
      success: true,
      data: cleanUser
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Gagal mengambil data profil pengguna.',
      error: error.message
    });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: { exclude: ['password_hash'] },
      include: [
        { model: Technician, as: 'technicianProfile', required: false },
        { model: Branch, as: 'branch', required: false, attributes: branchAttributes }
      ],
      order: [['created_at', 'DESC']]
    });

    const cleanUsers = users.map(u => {
      const raw = u.toJSON ? u.toJSON() : u;
      return {
        id: raw.id,
        username: raw.username,
        full_name: raw.full_name,
        email: raw.email,
        role: raw.role,
        branch_id: raw.branch_id,
        branch: raw.branch || null,
        technician: raw.technicianProfile || null,
        signature_url: raw.signature_url || null,
        delete_status: raw.delete_status || 'none',
        qc_affiliation: raw.qc_affiliation || 'Arisa'
      };
    });

    return res.status(200).json({
      success: true,
      data: cleanUsers
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Gagal mengambil daftar pengguna.',
      error: error.message
    });
  }
};

const uploadSignature = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User tidak ditemukan.' });
    }

    const isAllowedToUploadSig = 
      user.role === 'Coordinator' || 
      user.role === 'Admin' || 
      user.role === 'QA_Liaison';

    if (!isAllowedToUploadSig) {
      return res.status(403).json({
        success: false,
        message: 'Akses ditolak. Fitur upload tanda tangan khusus untuk role Coordinator dan QC Shopee.'
      });
    }

    const { signature_url } = req.body;
    user.signature_url = signature_url || null;
    await user.save();

    const updatedUser = await User.findByPk(user.id, {
      attributes: { exclude: ['password_hash'] },
      include: [
        { model: Technician, as: 'technicianProfile', required: false },
        { model: Branch, as: 'branch', required: false, attributes: branchAttributes }
      ]
    });

    const rawUser = updatedUser.toJSON ? updatedUser.toJSON() : updatedUser;
    const cleanUser = {
      id: rawUser.id,
      username: rawUser.username,
      full_name: rawUser.full_name,
      email: rawUser.email,
      role: rawUser.role,
      branch_id: rawUser.branch_id,
      branch: rawUser.branch || null,
      technician: rawUser.technicianProfile || null,
      signature_url: rawUser.signature_url || null,
      delete_status: rawUser.delete_status || 'none',
      qc_affiliation: rawUser.qc_affiliation || 'Arisa'
    };

    return res.status(200).json({
      success: true,
      message: signature_url ? 'Tanda tangan digital berhasil disimpan!' : 'Tanda tangan berhasil dihapus.',
      data: cleanUser
    });
  } catch (error) {
    console.error('Error uploading signature:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal menyimpan tanda tangan digital.',
      error: error.message
    });
  }
};

module.exports = {
  login,
  getMe,
  getAllUsers,
  uploadSignature
};
