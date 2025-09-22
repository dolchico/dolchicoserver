// routes/productRoute.js
import express from 'express';
import {
  listProducts,
  addProduct,
  updateProduct,   // ✅ new
  removeProduct,
  singleProduct,
  searchProducts,
} from '../controllers/productController.js';
import upload from '../middleware/multer.js';
import adminAuth from '../middleware/adminAuth.js';

const productRouter = express.Router();

// -------------------- Admin Routes --------------------

// ✅ Add Product
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

// ✅ Update Product
productRouter.put(
  '/update/:productId',
  adminAuth,
  upload.fields([
    { name: 'image1', maxCount: 1 },
    { name: 'image2', maxCount: 1 },
    { name: 'image3', maxCount: 1 },
    { name: 'image4', maxCount: 1 },
  ]),
  updateProduct
);

// ✅ Remove Product
productRouter.delete('/remove/:productId', adminAuth, removeProduct);

// -------------------- Public Routes --------------------

// ✅ Get single product
productRouter.get('/single/:productId', singleProduct);

// ✅ List all products
productRouter.get('/list', listProducts);

// ✅ Search products
productRouter.get('/search', searchProducts);

export default productRouter;
