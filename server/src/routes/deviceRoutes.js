const express = require('express');
const router = express.Router();
const deviceController = require('../controllers/deviceController');
const { verifyToken } = require('../middleware/auth');

// All routes protected by verifyToken
router.use(verifyToken);

// Customer endpoints
router.get('/customers', deviceController.getCustomers);
router.post('/customers', deviceController.createCustomer);

// Service Order endpoints
router.get('/service-orders', deviceController.getServiceOrders);
router.get('/service-orders/:id', deviceController.getServiceOrderById);
router.post('/service-orders/intake', deviceController.createIntake);
router.put('/service-orders/:id', deviceController.updateServiceOrder);

// Master Devices endpoints
router.get('/master', deviceController.getDevices);

module.exports = router;
