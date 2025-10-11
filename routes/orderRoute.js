// Updated routes/orderRouter.js - Add admin list route under /admin
import express from 'express';
import {
  placeOrder,
  allOrders,
  getSingleOrderController,
  userOrders,
  updateStatus,
  addItemToCart,
  getUserDeliveredProducts,
  adminListOrders // New import
} from '../controllers/orderController.js';
import adminAuth from '../middleware/adminAuth.js';

const orderRouter = express.Router();

// Cart Routes
orderRouter.post('/cart/add', addItemToCart);

// User Order Routes
orderRouter.post('/place', placeOrder);
orderRouter.get('/user', userOrders);
orderRouter.get('/products/user', getUserDeliveredProducts);

// Admin Routes
orderRouter.get('/admin/list', adminAuth, adminListOrders); // New admin list endpoint
orderRouter.get('/list', adminAuth, allOrders);
orderRouter.post('/status', adminAuth, updateStatus);

// Single Order Route
orderRouter.get('/:orderId', getSingleOrderController);

export default orderRouter;