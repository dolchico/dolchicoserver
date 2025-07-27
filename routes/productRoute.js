// routes/productRoute.js
import express from 'express';
import {
  listProducts,
  addProduct,
  removeProduct,
  singleProduct,
  searchProducts, // Add this new controller
} from '../controllers/productController.js';
import upload from '../middleware/multer.js';
import adminAuth from '../middleware/adminAuth.js';

const productRouter = express.Router();

// Admin routes (keep these for admin panel)
productRouter.post(
  '/add',
  adminAuth,
  upload.fields([
    { name: 'image1', maxCount: 1 },
    { name: 'image2', maxCount: 1 },
    { name: 'image3', maxCount: 1 },
    { name: 'image4', maxCount: 1 },
  ]),
  addProduct
);

productRouter.post('/remove', adminAuth, removeProduct);

// Public routes (for users)
productRouter.get('/single/:productId', singleProduct);
productRouter.get('/list', listProducts);
productRouter.get('/search', searchProducts); // Add this line

export default productRouter;
