const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const {
  getTechnicianTaskReport,
  getDeviceTaskReport
} = require('../controllers/reportController');

// All routes require authentication
router.use(verifyToken);

// 1. Status Task Per Teknisi
router.get('/technicians-task', requireRole('Admin', 'Coordinator', 'QA_Liaison', 'Technician'), getTechnicianTaskReport);

// 2. Done Tasks & Device Status (Sudah vs Belum Dikerjakan)
router.get('/devices-task', requireRole('Admin', 'Coordinator', 'QA_Liaison', 'Technician'), getDeviceTaskReport);

module.exports = router;
