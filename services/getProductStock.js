// services/productService.js
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getProductStock = async (productIds) => {
  try {
    if (!Array.isArray(productIds) || productIds.length === 0) {
      throw new Error('productIds must be a non-empty array');
    }
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, stock: true },
    });
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