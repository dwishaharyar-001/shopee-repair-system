const express = require('express');
const router = express.Router();
const repairController = require('../controllers/repairController');
const { verifyToken } = require('../middleware/auth');

// All routes protected by verifyToken
router.use(verifyToken);

router.get('/queue', repairController.getWorkQueue);
router.get('/parts-catalog', repairController.getPartsCatalog);
router.post('/orders/:id/start', repairController.startTimer);
router.put('/orders/:id/diagnostics', repairController.saveDiagnostics);
router.post('/orders/:id/stop', repairController.stopTimer);
router.post('/orders/:id/request-part', repairController.requestPart);
router.delete('/orders/:id/parts/:partConsumedId', repairController.removePartConsumed);
router.post('/orders/:id/broken-parts', repairController.addBrokenPart);
router.delete('/broken-parts/:brokenPartId', repairController.removeBrokenPart);
router.post('/orders/:id/submit-qc1', repairController.submitToQC1);

module.exports = router;
