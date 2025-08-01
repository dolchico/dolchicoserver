// routes/paymentRoutes.js
const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { authenticateToken } = require('../middleware/auth'); // Your auth middleware

// Initiate payment
router.post('/initiate', authenticateToken, paymentController.initiatePayment);

// Payment callback (no auth required)
router.post('/callback', paymentController.paymentCallback);

// Verify payment status
router.get('/status/:orderId', authenticateToken, paymentController.verifyPaymentStatus);

module.exports = router;
