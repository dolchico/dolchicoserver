import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Retrieves stock levels for multiple products by their IDs.
 * @param {number[]} productIds - An array of product IDs.
 * @returns {Promise<object>} A map of product IDs to their stock levels.
 * @throws {Error} If productIds is invalid or database operations fail.
 */
export const getProductStock = async (productIds) => {
  try {
    // Validate productIds is a non-empty array
    if (!Array.isArray(productIds) || productIds.length === 0) {
      throw new Error('productIds must be a non-empty array');
    }

    // Validate each productId is a positive integer
    const validProductIds = productIds.map(id => Number(id));
    const invalidIds = validProductIds.filter(id => isNaN(id) || id <= 0 || !Number.isInteger(id));
    if (invalidIds.length > 0) {
      throw new Error(`Invalid product IDs: ${invalidIds.join(', ')}`);
    }

    // Check database connection
    if (!prisma) {
      throw new Error('Database connection not available');
    }

    // Fetch product stock
    const products = await prisma.product.findMany({
      where: { id: { in: validProductIds } },
      select: { id: true, stock: true }
    });

    // Create stock map
    const stockMap = products.reduce((map, product) => {
      map[product.id] = product.stock ?? 0;
      return map;
    }, {});

    console.log('Product stock fetched:', stockMap); // Debug log
    return stockMap;
  } catch (error) {
    console.error('Error in getProductStock:', error);
    throw error;
  }
};