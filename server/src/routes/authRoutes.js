const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyToken, requireRole } = require('../middleware/auth');

// Public route
router.post('/login', authController.login);

// Protected routes
router.get('/me', verifyToken, authController.getMe);
router.get('/users', verifyToken, requireRole('Admin', 'Coordinator'), authController.getAllUsers);
router.post('/signature', verifyToken, requireRole('Coordinator', 'Admin'), authController.uploadSignature);

module.exports = router;
