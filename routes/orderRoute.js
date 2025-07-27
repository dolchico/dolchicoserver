import express from 'express';
import {
  placeOrder,
  allOrders,
  getSingleOrderController,
  userOrders,
  updateStatus,
  addItemToCart  // ✅ Add this import
} from '../controllers/orderController.js';
import authUser from '../middleware/auth.js';
import adminAuth from '../middleware/adminAuth.js';

const orderRouter = express.Router();

// Cart Routes
orderRouter.post('/cart/add', authUser, addItemToCart); // ✅ Add this route

// User Order Routes
orderRouter.post('/place', authUser, placeOrder);
orderRouter.post('/userorders', authUser, userOrders);

// Admin Routes
orderRouter.post('/list', adminAuth, allOrders);
orderRouter.post('/status', adminAuth, updateStatus);
orderRouter.get('/:orderId', authUser, getSingleOrderController);

export default orderRouter;
