// controllers/wishlistController.js
import {
  addToWishlistService,
  removeFromWishlistService,
  getWishlistService,
  isProductInWishlistService,
  getWishlistCountService,
  clearWishlistService,
  getWishlistWithPaginationService,
  bulkAddToWishlistService,
  getWishlistSummaryService
} from '../services/wishlistService.js';

// Helper function to get user ID with validation
// controllers/wishlistController.js - Update the getUserId helper
const getUserId = (req) => {
  // Try both userId and id from JWT payload
  const userId = req.user?.userId || req.user?.id;
  if (!userId) {
    console.error('JWT payload:', req.user); // Debug line
    throw new Error('User ID not found in authentication token');
  }
  return userId;
};


// Add a product to wishlist
export const addToWishlist = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { productId } = req.body;
    
    // Validation
    if (!productId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Product ID is required.',
        code: 'MISSING_PRODUCT_ID'
      });
    }

    if (isNaN(productId) || Number(productId) <= 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid product ID.',
        code: 'INVALID_PRODUCT_ID'
      });
    }
    
    const item = await addToWishlistService(userId, productId);
    
    res.status(201).json({ 
      success: true, 
      data: {
        wishlistItem: item,
        userId,
        productId: Number(productId)
      },
      message: 'Product added to wishlist successfully.'
    });
  } catch (err) {
    console.error('Add to wishlist error:', err);
    
    // Handle specific errors
    switch (err.message) {
      case 'Product already in wishlist':
        return res.status(409).json({ 
          success: false, 
          message: 'Product is already in your wishlist.',
          code: 'ALREADY_EXISTS'
        });
      case 'Product not found':
        return res.status(404).json({ 
          success: false, 
          message: 'Product not found.',
          code: 'PRODUCT_NOT_FOUND'
        });
      case 'User ID not found in authentication token':
        return res.status(401).json({ 
          success: false, 
          message: 'Authentication error.',
          code: 'AUTH_ERROR'
        });
      default:
        return res.status(500).json({ 
          success: false, 
          message: 'Failed to add product to wishlist.',
          code: 'SERVER_ERROR'
        });
    }
  }
};

// Remove a product from wishlist
export const removeFromWishlist = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { productId } = req.params;
    
    // Validation
    if (!productId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Product ID is required.',
        code: 'MISSING_PRODUCT_ID'
      });
    }

    if (isNaN(productId) || Number(productId) <= 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid product ID.',
        code: 'INVALID_PRODUCT_ID'
      });
    }
    
    await removeFromWishlistService(userId, productId);
    
    res.json({ 
      success: true,
      data: {
        userId,
        productId: Number(productId)
      },
      message: 'Product removed from wishlist successfully.'
    });
  } catch (err) {
    console.error('Remove from wishlist error:', err);
    
    if (err.code === 'P2025') {
      return res.status(404).json({ 
        success: false, 
        message: 'Product not found in wishlist.',
        code: 'NOT_IN_WISHLIST'
      });
    }
    
    if (err.message === 'User ID not found in authentication token') {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication error.',
        code: 'AUTH_ERROR'
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Failed to remove product from wishlist.',
      code: 'SERVER_ERROR'
    });
  }
};

// Get user's wishlist
export const getWishlist = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { page, limit, category, sort } = req.query;
    
    // Validate pagination parameters
    const pageNum = page ? Math.max(1, parseInt(page)) : null;
    const limitNum = limit ? Math.max(1, Math.min(100, parseInt(limit))) : null;
    
    // If pagination parameters are provided, use paginated service
    if (pageNum || limitNum) {
      const result = await getWishlistWithPaginationService(
        userId, 
        pageNum || 1, 
        limitNum || 10,
        { category, sort }
      );
      
      return res.json({ 
        success: true, 
        data: {
          ...result,
          user: req.userStatus ? {
            id: req.userStatus.id,
            name: req.userStatus.name || null,
            isProfileComplete: req.userStatus.isProfileComplete
          } : null
        },
        message: 'Wishlist retrieved successfully.'
      });
    }
    
    // Regular non-paginated wishlist
    const wishlist = await getWishlistService(userId, { category, sort });
    
    res.json({ 
      success: true, 
      data: {
        wishlist,
        count: wishlist.length,
        user: req.userStatus ? {
          id: req.userStatus.id,
          name: req.userStatus.name || null,
          isProfileComplete: req.userStatus.isProfileComplete
        } : null
      },
      message: 'Wishlist retrieved successfully.'
    });
  } catch (err) {
    console.error('Get wishlist error:', err);
    
    if (err.message === 'User ID not found in authentication token') {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication error.',
        code: 'AUTH_ERROR'
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch wishlist.',
      code: 'SERVER_ERROR'
    });
  }
};

// Check if product is in wishlist
export const checkProductInWishlist = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { productId } = req.params;
    
    if (!productId || isNaN(productId) || Number(productId) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid product ID is required',
        code: 'INVALID_PRODUCT_ID'
      });
    }
    
    const isInWishlist = await isProductInWishlistService(userId, productId);
    
    res.json({
      success: true,
      data: {
        isInWishlist,
        productId: Number(productId),
        userId
      },
      message: 'Wishlist status checked successfully.'
    });
  } catch (error) {
    console.error('Check wishlist error:', error);
    
    if (error.message === 'User ID not found in authentication token') {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication error.',
        code: 'AUTH_ERROR'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to check wishlist status',
      code: 'SERVER_ERROR'
    });
  }
};

// Get wishlist count
export const getWishlistCount = async (req, res) => {
  try {
    const userId = getUserId(req);
    const count = await getWishlistCountService(userId);
    
    res.json({
      success: true,
      data: {
        count,
        userId
      },
      message: 'Wishlist count retrieved successfully.'
    });
  } catch (error) {
    console.error('Get wishlist count error:', error);
    
    if (error.message === 'User ID not found in authentication token') {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication error.',
        code: 'AUTH_ERROR'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to get wishlist count',
      code: 'SERVER_ERROR'
    });
  }
};

// Clear entire wishlist
export const clearWishlist = async (req, res) => {
  try {
    const userId = getUserId(req);
    const result = await clearWishlistService(userId);
    
    res.json({
      success: true,
      data: {
        deletedCount: result.count,
        userId
      },
      message: 'Wishlist cleared successfully.'
    });
  } catch (error) {
    console.error('Clear wishlist error:', error);
    
    if (error.message === 'User ID not found in authentication token') {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication error.',
        code: 'AUTH_ERROR'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to clear wishlist',
      code: 'SERVER_ERROR'
    });
  }
};

// Bulk add to wishlist
export const bulkAddToWishlist = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { productIds } = req.body;
    
    // Validation
    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Product IDs array is required and cannot be empty',
        code: 'MISSING_PRODUCT_IDS'
      });
    }

    if (productIds.length > 50) {
      return res.status(400).json({
        success: false,
        message: 'Cannot add more than 50 products at once',
        code: 'TOO_MANY_PRODUCTS'
      });
    }

    // Validate each product ID
    const invalidIds = productIds.filter(id => isNaN(id) || Number(id) <= 0);
    if (invalidIds.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'All product IDs must be valid positive numbers',
        code: 'INVALID_PRODUCT_IDS',
        invalidIds
      });
    }
    
    const result = await bulkAddToWishlistService(userId, productIds);
    
    res.json({
      success: true,
      data: {
        addedCount: result.added,
        errors: result.errors,
        validProductIds: result.validProductIds,
        userId
      },
      message: `${result.added} products added to wishlist successfully.`
    });
  } catch (error) {
    console.error('Bulk add to wishlist error:', error);
    
    if (error.message === 'User ID not found in authentication token') {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication error.',
        code: 'AUTH_ERROR'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to bulk add to wishlist',
      code: 'SERVER_ERROR'
    });
  }
};

// Get wishlist summary
export const getWishlistSummary = async (req, res) => {
  try {
    const userId = getUserId(req);
    const summary = await getWishlistSummaryService(userId);
    
    res.json({
      success: true,
      data: {
        ...summary,
        userId
      },
      message: 'Wishlist summary retrieved successfully.'
    });
  } catch (error) {
    console.error('Get wishlist summary error:', error);
    
    if (error.message === 'User ID not found in authentication token') {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication error.',
        code: 'AUTH_ERROR'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to get wishlist summary',
      code: 'SERVER_ERROR'
    });
  }
};
