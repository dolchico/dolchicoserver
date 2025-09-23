import express from 'express';
import {
  placeOrder,
  allOrders,
  getSingleOrderController,
  userOrders,
  updateStatus,
  addItemToCart
} from '../controllers/orderController.js';
import adminAuth from '../middleware/adminAuth.js';

const orderRouter = express.Router();

// Cart Routes
orderRouter.post('/cart/add', addItemToCart);

// User Order Routes
orderRouter.post('/place',placeOrder);
orderRouter.get('/user',userOrders);  // ✅ FIXED: Changed POST to GET

// Admin Routes
orderRouter.get('/list', adminAuth, allOrders);   // ✅ FIXED: Changed POST to GET  
orderRouter.post('/status', adminAuth, updateStatus); // Keep POST for updates

// Single Order Route
orderRouter.get('/:orderId', getSingleOrderController);

export default orderRouter;
