const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const {
  getAllPermissions,
  getMyPermissions,
  updatePermissions,
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
  updateUserBranch
} = require('../controllers/menuController');

// All routes require authentication
router.use(verifyToken);

// Get current user's menu access
router.get('/my-permissions', getMyPermissions);

// Get matrix of all permissions (Admin & Coordinator)
router.get('/permissions', requireRole('Admin', 'Coordinator'), getAllPermissions);

// Update role menu access (Admin only)
router.put('/permissions', requireRole('Admin'), updatePermissions);

// Get list of users (Admin & Coordinator)
router.get('/users', requireRole('Admin', 'Coordinator'), getAllUsers);

// Admin User CRUD Operations
router.post('/users', requireRole('Admin'), createUser);
router.put('/users/:id', requireRole('Admin'), updateUser);
router.delete('/users/:id', requireRole('Admin'), deleteUser);
router.put('/users/:id/branch', requireRole('Admin'), updateUserBranch);

module.exports = router;
