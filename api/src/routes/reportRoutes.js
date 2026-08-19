const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const {
  getTechnicianTaskReport,
  getDeviceTaskReport,
  getBASTDocument,
  exportKPICSV,
  getIntakeDailyBASTReport,
  getCompletedWeeklyBASTReport,
  getUsedSparePartsWeeklyBASTReport,
  getDiagnosticDeviceCountReport
} = require('../controllers/reportController');

// All routes require authentication
router.use(verifyToken);

// 1. Status Task Per Teknisi
router.get('/technicians-task', requireRole('Admin', 'Coordinator', 'QA_Liaison', 'Technician'), getTechnicianTaskReport);

// 2. Done Tasks & Device Status (Sudah vs Belum Dikerjakan)
router.get('/devices-task', requireRole('Admin', 'Coordinator', 'QA_Liaison', 'Technician'), getDeviceTaskReport);

// 3. BAST Document Detail (Single Order)
router.get('/bast/:id', requireRole('Admin', 'Coordinator', 'QA_Liaison', 'Technician'), getBASTDocument);

// 4. BAST Official Reports
router.get('/bast-report/intake-daily', requireRole('Admin', 'Coordinator', 'QA_Liaison', 'Technician'), getIntakeDailyBASTReport);
router.get('/bast-report/completed-weekly', requireRole('Admin', 'Coordinator', 'QA_Liaison', 'Technician'), getCompletedWeeklyBASTReport);
router.get('/bast-report/used-parts-weekly', requireRole('Admin', 'Coordinator', 'QA_Liaison', 'Technician'), getUsedSparePartsWeeklyBASTReport);

// 5. Export KPI Data Excel (CSV) with full timestamps
router.get('/export-csv', requireRole('Admin', 'Coordinator', 'QA_Liaison', 'Technician'), exportKPICSV);

// 6. Diagnostic Device Count & Billing Calculator (STRICT ADMIN ONLY)
router.get('/diagnostic-count', requireRole('Admin'), getDiagnosticDeviceCountReport);

module.exports = router;
