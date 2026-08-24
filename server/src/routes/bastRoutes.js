const express = require('express');
const router = express.Router();
const bastController = require('../controllers/bastController');
const { verifyToken } = require('../middleware/auth');

// All routes protected by verifyToken
router.use(verifyToken);

// BAST endpoints
router.post('/create', bastController.createBast);
router.get('/pending-sea', bastController.getPendingSeaBasts);
router.get('/history', bastController.getBastHistory);
router.get('/:id', bastController.getBastById);
router.post('/:id/verify', bastController.verifyBastBySea);

module.exports = router;
