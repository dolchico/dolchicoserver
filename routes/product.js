// routes/product.js
import { Router } from 'express';
import { getProductStock } from '../services/productService.js'; // Adjust path if needed
import authMiddleware from '../middleware/auth.js'; // Adjust path if needed

const router = Router();

router.post('/product/stock', authMiddleware, async (req, res) => {
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

// Add other product routes if needed (e.g., for /api/product/single)
router.get('/product/single/:id', async (req, res) => {
  try {
    const product = await getProductById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    res.status(200).json({ success: true, product });
  } catch (err) {
    console.error('Get Product Controller Error:', err);
    res.status(500).json({ success: false, message: 'An internal server error occurred.' });
  }
});

export default router;