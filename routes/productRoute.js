// Updated routes/productRoute.js - Add admin list route
import express from 'express';
import {
  listProducts,
  addProduct,
  removeProduct,
  singleProduct,
  updateProduct,
  searchProducts,
  adminListProducts // New import
} from '../controllers/productController.js';
import upload from '../middleware/multer.js';
import { ensureAuthWithStatus, ensureRole } from '../middleware/authMiddleware.js';
import authUser from '../middleware/auth.js';
import { getProductStock, getProductById } from '../services/productService.js';
const router = express.Router();
const adminRouter = express.Router();
const publicRouter = express.Router();

// Apply admin middlewares
adminRouter.use(ensureAuthWithStatus, ensureRole(['ADMIN']));

// Admin routes
adminRouter.post('/add', (req, res, next) => {
  if (req.headers['content-type']?.includes('multipart/form-data')) {
    upload.array('images', 6)(req, res, next);
  } else {
    next();
  }
}, addProduct);

adminRouter.get('/list', adminListProducts); // New admin list endpoint

adminRouter.post('/remove', removeProduct);
adminRouter.post('/update', upload.array('images', 6), updateProduct);

// Public routes
publicRouter.get('/single/:productId', singleProduct);
publicRouter.get('/list', listProducts);
publicRouter.get('/search', searchProducts);

publicRouter.post('/stock', authUser, async (req, res) => {
  try {
    const { productIds } = req.body;
    if (!Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid or empty productIds array' });
    }
    const stockData = await getProductStock(productIds);
    res.status(200).json({ success: true, data: stockData });
  } catch (err) {
    console.error('Get Product Stock Controller Error:', err);
    res.status(500).json({ success: false, message: 'An internal server error occurred.', error: err.message });
  }
});

publicRouter.get('/product/single/:id', async (req, res) => {
  try {
    const product = await getProductById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    return res.status(200).json({ success: true, product });
  } catch (err) {
    console.error('Get Product Controller Error:', err);
    res.status(500).json({ success: false, message: 'An internal server error occurred.' });
  }
});

// Mount subrouters
router.use('/admin', adminRouter);
router.use(publicRouter);

export default router;