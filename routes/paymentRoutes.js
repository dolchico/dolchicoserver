import express from 'express';
import {
  createPaymentOrder,
  verifyPayment,
  getPaymentStatus,
  retryPayment
} from '../controllers/paymentController.js';
import authUser from '../middleware/auth.js';

const paymentRouter = express.Router();

// Create Razorpay order from cart
paymentRouter.post('/create-order', authUser, createPaymentOrder);

// Verify payment after successful payment
paymentRouter.post('/verify', authUser, verifyPayment);

// Get payment status for an order
paymentRouter.get('/status/:orderId', authUser, getPaymentStatus);

// Retry payment for failed orders
paymentRouter.post('/retry/:orderId', authUser, retryPayment);

export default paymentRouter;
