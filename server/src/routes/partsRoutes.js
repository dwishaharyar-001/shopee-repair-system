const express = require('express');
const router = express.Router();
const partsController = require('../controllers/partsController');
const { verifyToken } = require('../middleware/auth');

// All routes protected by verifyToken
router.use(verifyToken);

router.get('/', partsController.getInventoryParts);
router.get('/metrics', partsController.getInventoryMetrics);
router.get('/harvest-logs', partsController.getHarvestLogs);
router.post('/', partsController.createPart);
router.put('/:id', partsController.updatePart);
router.post('/harvest', partsController.harvestPart);

module.exports = router;
