const express = require('express');
const router = express.Router();
const qcController = require('../controllers/qcController');
const { verifyToken } = require('../middleware/auth');

// All routes protected by verifyToken
router.use(verifyToken);

router.get('/pending', qcController.getQCPendingQueue);
router.get('/history', qcController.getQCHistory);
router.get('/metrics', qcController.getQCMetrics);
router.post('/checkpoint1', qcController.submitQC1);
router.post('/checkpoint2', qcController.submitQC2);

module.exports = router;
