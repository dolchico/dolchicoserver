// routes/paymentRoutes.js
import express from 'express';
import paymentController from '../controllers/paymentController.js';
import { authenticateToken } from '../middleware/auth.js'; // Your auth middleware

const router = express.Router();

// Initiate payment
router.post('/initiate', authenticateToken, paymentController.initiatePayment);

// Payment callback (no auth required)
router.post('/callback', paymentController.paymentCallback);

// Verify payment status
router.get('/status/:orderId', authenticateToken, paymentController.verifyPaymentStatus);

export default router;
