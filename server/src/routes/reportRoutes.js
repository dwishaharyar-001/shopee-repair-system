const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const {
  getTechnicianTaskReport,
  getDeviceTaskReport,
  getBASTDocument,
  exportKPICSV
} = require('../controllers/reportController');

// All routes require authentication
router.use(verifyToken);

// 1. Status Task Per Teknisi
router.get('/technicians-task', requireRole('Admin', 'Coordinator', 'QA_Liaison', 'Technician'), getTechnicianTaskReport);

// 2. Done Tasks & Device Status (Sudah vs Belum Dikerjakan)
router.get('/devices-task', requireRole('Admin', 'Coordinator', 'QA_Liaison', 'Technician'), getDeviceTaskReport);

// 3. BAST Document Detail
router.get('/bast/:id', requireRole('Admin', 'Coordinator', 'QA_Liaison', 'Technician'), getBASTDocument);

// 4. Export KPI Data Excel (CSV) with full timestamps
router.get('/export-csv', requireRole('Admin', 'Coordinator', 'QA_Liaison', 'Technician'), exportKPICSV);

module.exports = router;
