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
  requestDeleteUser,
  approveDeleteUser,
  rejectDeleteUser,
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

// Admin & Coordinator User Operations
router.post('/users', requireRole('Admin', 'Coordinator'), createUser);
router.put('/users/:id', requireRole('Admin', 'Coordinator'), updateUser);
router.delete('/users/:id', requireRole('Admin', 'Coordinator'), deleteUser);
router.put('/users/:id/branch', requireRole('Admin', 'Coordinator'), updateUserBranch);

// Delete Workflow: Coordinator requests delete -> Admin approves/rejects
router.delete('/users/:id/request-delete', requireRole('Coordinator', 'Admin'), requestDeleteUser);
router.post('/users/:id/approve-delete', requireRole('Admin'), approveDeleteUser);
router.post('/users/:id/reject-delete', requireRole('Admin'), rejectDeleteUser);

module.exports = router;
