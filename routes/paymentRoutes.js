import express from 'express';
import {
  createPaymentOrder,
  verifyPayment,
  verifyPaymentAPI,
  getPaymentStatus,
  retryPayment,
  testRazorpayConfig,
  testSignatureGeneration
} from '../controllers/paymentController.js';
import authUser from '../middleware/auth.js';

const paymentRouter = express.Router();

// Test endpoints (no auth required for debugging) - must be before authUser middleware
paymentRouter.get('/test-config', testRazorpayConfig);
paymentRouter.post('/test-signature', testSignatureGeneration);

// Apply auth middleware to all other routes
paymentRouter.use(authUser);

// Create Razorpay order from cart
paymentRouter.post('/create-order', createPaymentOrder);

// Verify payment after successful payment (signature-based)
paymentRouter.post('/verify', verifyPayment);

// Alternative verification using Razorpay API (no signature needed)
paymentRouter.post('/verify-api', verifyPaymentAPI);

// Get payment status for an order
paymentRouter.get('/status/:orderId', getPaymentStatus);

// Retry payment for failed orders
paymentRouter.post('/retry/:orderId', retryPayment);

export default paymentRouter;
