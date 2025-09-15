import express from 'express';
import {
  createPaymentOrder,
  verifyPayment,
  getPaymentStatus,
  retryPayment,
  testRazorpayConfig
} from '../controllers/paymentController.js';
import authUser from '../middleware/auth.js';

const paymentRouter = express.Router();

// Test endpoint (no auth required for debugging) - must be before authUser middleware
paymentRouter.get('/test-config', testRazorpayConfig);

// Apply auth middleware to all other routes
paymentRouter.use(authUser);

// Create Razorpay order from cart
paymentRouter.post('/create-order', createPaymentOrder);

// Verify payment after successful payment
paymentRouter.post('/verify', verifyPayment);

// Get payment status for an order
paymentRouter.get('/status/:orderId', getPaymentStatus);

// Retry payment for failed orders
paymentRouter.post('/retry/:orderId', retryPayment);

export default paymentRouter;
