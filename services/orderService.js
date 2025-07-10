import  prisma  from '../lib/prisma.js'
import { serializeBigInts } from '../utils/serializeBigInt.js';



export const createOrder = async (orderData) => {
  return await prisma.order.create({
    data: {
      user: {
        connect: { id: orderData.userId }
      },
      amount: orderData.amount,
      address: orderData.address,
      paymentMethod: 'COD',
      payment: false,
      status: 'Order Placed',
      date: Date.now(),
      items: {
        create: orderData.items.map(item => ({
          product: {
            connect: { id: item.productId }
          },
          quantity: item.quantity,
          size: item.size ?? "Default",
          user: {
            connect: { id: orderData.userId }
          }
        })),
      },
    },
    include: {
      items: true,
    },
  });
};





/**
 * Get all orders (admin)
 */

export const getAllOrders = async () => {
  const orders = await prisma.order.findMany({
    include: {
      items: true,
      user: true,
    },
    orderBy: { date: 'desc' },
  });

  return serializeBigInts(orders);
};


/**
 * Get user-specific orders
 */
export const getUserOrders = async (userId) => {
  return await prisma.order.findMany({
    where: { userId },
    include: { items: true },
    orderBy: { date: 'desc' },
  });
};

/**
 * Update order status (admin)
 */
export const updateOrderStatus = async (orderId, status) => {
  return await prisma.order.update({
    where: { id: Number(orderId) },
    data: { status },
  });
};
