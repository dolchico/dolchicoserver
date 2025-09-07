// services/wishlistService.js
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// REVISED: Define a standard way to include product data with its new relations
const productInclude = {
  id: true,
  name: true,
  description: true,
  price: true,
  image: true,
  sizes: true,
  bestseller: true,
  isActive: true,
  stock: true,
  createdAt: true,
  category: true,    // Include the full category object { id, name, ... }
  subcategory: true, // Include the full subcategory object { id, name, ... }
};

// Add product to wishlist
export const addToWishlistService = async (userId, productId) => {
  try {
    const userIdNum = Number(userId);
    const productIdNum = Number(productId);

    if (!userIdNum || !productIdNum) {
      throw new Error('Invalid user ID or product ID');
    }

    // First check if product exists and is active
    const productExists = await prisma.product.findFirst({
      where: { 
        id: productIdNum,
        isActive: true
      }
    });
    
    if (!productExists) {
      throw new Error('Product not found');
    }

    // Check if already in wishlist
    const exists = await prisma.wishlist.findUnique({
      where: {
        userId_productId: { 
          userId: userIdNum, 
          productId: productIdNum
        }
      }
    });
    
    if (exists) {
      throw new Error('Product already in wishlist');
    }

    // Create wishlist entry
    const wishlistItem = await prisma.wishlist.create({
      data: {
        userId: userIdNum,
        productId: productIdNum
      },
      include: {
        product: {
          select: productInclude
        }
      }
    });

    return wishlistItem;
  } catch (error) {
    console.error('Error adding to wishlist:', error);
    throw error;
  }
};

// Remove product from wishlist
export const removeFromWishlistService = async (userId, productId) => {
  try {
    const userIdNum = Number(userId);
    const productIdNum = Number(productId);

    if (!userIdNum || !productIdNum) {
      throw new Error('Invalid user ID or product ID');
    }

    const result = await prisma.wishlist.delete({
      where: {
        userId_productId: { 
          userId: userIdNum, 
          productId: productIdNum
        }
      }
    });

    return result;
  } catch (error) {
    console.error('Error removing from wishlist:', error);
    throw error;
  }
};

// Get all wishlist items for a user
export const getWishlistService = async (userId, options = {}) => {
  try {
    const userIdNum = Number(userId);
    if (!userIdNum) {
      throw new Error('Invalid user ID');
    }

    const { category, sort } = options;
    
    // Build where clause
    const where = { 
      userId: userIdNum,
      product: {
        isActive: true
      }
    };

    if (category) {
      where.product.category = { name: { equals: category, mode: 'insensitive' } };
    }

    // Build order by clause
    let orderBy = { createdAt: 'desc' };
    
    if (sort === 'name') {
      orderBy = { product: { name: 'asc' } };
    } else if (sort === 'price_low') {
      orderBy = { product: { price: 'asc' } };
    } else if (sort === 'price_high') {
      orderBy = { product: { price: 'desc' } };
    } else if (sort === 'newest') {
      orderBy = { createdAt: 'desc' };
    } else if (sort === 'oldest') {
      orderBy = { createdAt: 'asc' };
    }

    const wishlist = await prisma.wishlist.findMany({
      where,
      include: { 
        product: {
          select: productInclude
        }
      },
      orderBy
    });

    return wishlist;
  } catch (error) {
    console.error('Error fetching wishlist:', error);
    throw error;
  }
};

// Check if a product is in user's wishlist
export const isProductInWishlistService = async (userId, productId) => {
  try {
    const userIdNum = Number(userId);
    const productIdNum = Number(productId);

    if (!userIdNum || !productIdNum) {
      throw new Error('Invalid user ID or product ID');
    }

    const item = await prisma.wishlist.findUnique({
      where: {
        userId_productId: { 
          userId: userIdNum, 
          productId: productIdNum
        }
      }
    });
    
    return !!item;
  } catch (error) {
    console.error('Error checking wishlist:', error);
    throw error;
  }
};

// Get wishlist count for a user
export const getWishlistCountService = async (userId) => {
  try {
    const userIdNum = Number(userId);
    if (!userIdNum) {
      throw new Error('Invalid user ID');
    }

    const count = await prisma.wishlist.count({
      where: { 
        userId: userIdNum,
        product: {
          isActive: true
        }
      }
    });

    return count;
  } catch (error) {
    console.error('Error getting wishlist count:', error);
    throw error;
  }
};

// Clear entire wishlist for a user
export const clearWishlistService = async (userId) => {
  try {
    const userIdNum = Number(userId);
    if (!userIdNum) {
      throw new Error('Invalid user ID');
    }

    const result = await prisma.wishlist.deleteMany({
      where: { userId: userIdNum }
    });

    return result;
  } catch (error) {
    console.error('Error clearing wishlist:', error);
    throw error;
  }
};

// Get wishlist with pagination
export const getWishlistWithPaginationService = async (userId, page = 1, limit = 10, options = {}) => {
  try {
    const userIdNum = Number(userId);
    if (!userIdNum) {
      throw new Error('Invalid user ID');
    }

    const skip = (page - 1) * limit;
    const { category, sort } = options;
    
    // Build where clause
    const where = { 
      userId: userIdNum,
      product: {
        isActive: true
      }
    };

    if (category) {
      where.product.category = { name: { equals: category, mode: 'insensitive' } };
    }

    // Build order by clause
    let orderBy = { createdAt: 'desc' };
    
    if (sort === 'name') {
      orderBy = { product: { name: 'asc' } };
    } else if (sort === 'price_low') {
      orderBy = { product: { price: 'asc' } };
    } else if (sort === 'price_high') {
      orderBy = { product: { price: 'desc' } };
    }
    
    const [wishlist, total] = await Promise.all([
      prisma.wishlist.findMany({
        where,
        include: { 
          product: {
            select: productInclude
          }
        },
        orderBy,
        skip,
        take: limit
      }),
      prisma.wishlist.count({ where })
    ]);

    return {
      wishlist,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: limit,
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1
      }
    };
  } catch (error) {
    console.error('Error fetching paginated wishlist:', error);
    throw error;
  }
};

// Bulk add products to wishlist
export const bulkAddToWishlistService = async (userId, productIds) => {
  try {
    const userIdNum = Number(userId);
    if (!userIdNum) {
      throw new Error('Invalid user ID');
    }

    const validProductIds = [];
    const errors = [];

    // Use transaction for bulk operations
    const result = await prisma.$transaction(async (tx) => {
      // Check which products exist and aren't already in wishlist
      for (const productId of productIds) {
        const productIdNum = Number(productId);
        
        if (!productIdNum) {
          errors.push(`Invalid product ID: ${productId}`);
          continue;
        }

        const productExists = await tx.product.findFirst({
          where: { 
            id: productIdNum,
            isActive: true
          }
        });

        if (!productExists) {
          errors.push(`Product ${productId} not found or inactive`);
          continue;
        }

        const alreadyInWishlist = await tx.wishlist.findUnique({
          where: {
            userId_productId: { 
              userId: userIdNum, 
              productId: productIdNum
            }
          }
        });

        if (alreadyInWishlist) {
          errors.push(`Product ${productId} already in wishlist`);
          continue;
        }

        validProductIds.push(productIdNum);
      }

      // Bulk create valid entries
      if (validProductIds.length > 0) {
        const createResult = await tx.wishlist.createMany({
          data: validProductIds.map(productId => ({
            userId: userIdNum,
            productId
          })),
          skipDuplicates: true
        });

        return createResult;
      }

      return { count: 0 };
    });

    return {
      added: result.count,
      errors,
      validProductIds
    };
  } catch (error) {
    console.error('Error bulk adding to wishlist:', error);
    throw error;
  }
};

// Get wishlist summary (counts by category)
export const getWishlistSummaryService = async (userId) => {
  try {
    const userIdNum = Number(userId);
    if (!userIdNum) {
      throw new Error('Invalid user ID');
    }

    const wishlist = await prisma.wishlist.findMany({
      where: { 
        userId: userIdNum,
        product: {
          isActive: true
        }
      },
      include: {
        product: {
          select: {
            category: true,
            subcategory: true,
            price: true
          }
        }
      }
    });

    const summary = {
      totalItems: wishlist.length,
      totalValue: wishlist.reduce((sum, item) => sum + Number(item.product.price), 0),
      categories: {},
      subCategories: {},
      averagePrice: 0
    };

    if (wishlist.length > 0) {
      summary.averagePrice = summary.totalValue / wishlist.length;
      
      wishlist.forEach(item => {
        const categoryName = item.product.category.name;
        const subCategoryName = item.product.subcategory.name;
        
        // Count by category name
        summary.categories[categoryName] = (summary.categories[categoryName] || 0) + 1;
        
        // Count by subcategory name
        summary.subCategories[subCategoryName] = (summary.subCategories[subCategoryName] || 0) + 1;
      });
    }

    return summary;
  } catch (error) {
    console.error('Error getting wishlist summary:', error);
    throw error;
  }
};
