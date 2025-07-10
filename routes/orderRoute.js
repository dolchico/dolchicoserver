// orderRoutes.js
import express from 'express';
import {
  placeOrder,
  allOrders,
  userOrders,
  updateStatus
} from '../controllers/orderController.js';
import authUser from '../middleware/auth.js';
import adminAuth from '../middleware/adminAuth.js';

const orderRouter = express.Router();

// User Routes
orderRouter.post('/place', authUser, placeOrder);
orderRouter.post('/userorders', authUser, userOrders);

// Admin Routes
orderRouter.post('/list', adminAuth, allOrders);
orderRouter.post('/status', adminAuth, updateStatus);

export default orderRouter;
