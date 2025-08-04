// routes/wishlistRoutes.js
import express from 'express';
import {
  addToWishlist,
  removeFromWishlist,
  getWishlist,
  checkProductInWishlist,
  getWishlistCount,
  clearWishlist,
  bulkAddToWishlist,
  getWishlistSummary
} from '../controllers/wishlistController.js';
import { 
  ensureAuthWithStatus
} from "../middleware/authMiddleware.js";

const router = express.Router();

// ================================
// WISHLIST ROUTES
// ================================

// Get wishlist summary (should be before /:productId routes)
router.get('/summary', ensureAuthWithStatus, getWishlistSummary);

// Get wishlist count (should be before /:productId routes)
router.get('/count', ensureAuthWithStatus, getWishlistCount);

// Check if product is in wishlist (should be before /:productId routes)
router.get('/check/:productId', ensureAuthWithStatus, checkProductInWishlist);

// Get user's wishlist (supports pagination and filtering)
router.get('/', ensureAuthWithStatus, getWishlist);

// Add item to wishlist
router.post('/', ensureAuthWithStatus, addToWishlist);

// Bulk add items to wishlist
router.post('/bulk', ensureAuthWithStatus, bulkAddToWishlist);

// Remove specific item from wishlist
router.delete('/:productId', ensureAuthWithStatus, removeFromWishlist);

// Clear entire wishlist
router.delete('/', ensureAuthWithStatus, clearWishlist);

// ================================
// ROUTE DOCUMENTATION
// ================================

/*
API Endpoints:

GET /wishlist                    - Get user's wishlist (supports ?page, ?limit, ?category, ?sort)
GET /wishlist/count              - Get wishlist item count
GET /wishlist/summary            - Get wishlist summary with statistics
GET /wishlist/check/:productId   - Check if product is in wishlist

POST /wishlist                   - Add single product to wishlist
POST /wishlist/bulk              - Add multiple products to wishlist

DELETE /wishlist/:productId      - Remove specific product from wishlist
DELETE /wishlist                 - Clear entire wishlist

Query Parameters for GET /wishlist:
- page: Page number for pagination (default: 1)
- limit: Items per page (default: 10, max: 100)
- category: Filter by product category
- sort: Sort order (name, price_low, price_high, newest, oldest)

Examples:
GET /wishlist?page=1&limit=20&category=Electronics&sort=price_low
GET /wishlist/check/123
POST /wishlist { "productId": 123 }
POST /wishlist/bulk { "productIds": [1, 2, 3, 4, 5] }
DELETE /wishlist/123
*/

export default router;
