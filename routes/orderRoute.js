import express from 'express';
import {
  placeOrder,
  allOrders,
  getSingleOrderController,
  userOrders,
  updateStatus,
  addItemToCart
} from '../controllers/orderController.js';
import authUser from '../middleware/auth.js';
import adminAuth from '../middleware/adminAuth.js';

const orderRouter = express.Router();

// Cart Routes
orderRouter.post('/cart/add', authUser, addItemToCart);

// User Order Routes
orderRouter.post('/place', authUser, placeOrder);
orderRouter.get('/user', authUser, userOrders);  // ✅ FIXED: Changed POST to GET

// Admin Routes
orderRouter.get('/list', adminAuth, allOrders);   // ✅ FIXED: Changed POST to GET  
orderRouter.post('/status', adminAuth, updateStatus); // Keep POST for updates

// Single Order Route
orderRouter.get('/:orderId', authUser, getSingleOrderController);

export default orderRouter;
