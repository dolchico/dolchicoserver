import prisma from '../lib/prisma.js';
import { serializeBigInts } from '../utils/serializeBigInt.js';


export const addToCartService = async ({ userId, itemId, size }) => {
  // check if cart item exists
  const existing = await prisma.cartItem.findFirst({
    where: { userId, productId: Number(itemId), size }
  });

  if (existing) {
    return await prisma.cartItem.update({
      where: { id: existing.id },
      data: { quantity: existing.quantity + 1 }
    });
  }

  return await prisma.cartItem.create({
    data: {
      userId,
      productId: Number(itemId),
      size,
      quantity: 1
    }
  });
};

export const updateCartService = async ({ userId, itemId, size, quantity }) => {
  const existing = await prisma.cartItem.findFirst({
    where: { userId, productId: Number(itemId), size }
  });

  if (!existing) throw new Error("Cart item not found");

  return await prisma.cartItem.update({
    where: { id: existing.id },
    data: { quantity }
  });
};

export const getCartService = async (userId) => {
  const rawData = await prisma.cartItem.findMany({
    where: { userId },
    include: { product: true }
  });
  
  return serializeBigInts(rawData);
};
