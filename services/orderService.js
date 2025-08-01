import prisma from '../lib/prisma.js'
import { serializeBigInts } from '../utils/serializeBigInt.js';

// This will now work without conflicts
export const createOrder = async (orderData) => {
  const order = await prisma.$transaction(async (tx) => {
    // Get product prices
    const productIds = orderData.items.map(item => item.productId);
    const products = await tx.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, price: true }
    });

    const priceMap = products.reduce((acc, product) => {
      acc[product.id] = product.price;
      return acc;
    }, {});

    // Create order with OrderItems (clean separation)
    const order = await tx.order.create({
      data: {
        user: { connect: { id: orderData.userId } },
        amount: orderData.amount,
        address: orderData.address,
        paymentMethod: 'COD',
        payment: false,
        status: 'ORDER_PLACED',
        date: Date.now(),
        items: {
          create: orderData.items.map(item => ({
            product: { connect: { id: item.productId } },
            quantity: item.quantity,
            size: item.size ?? "Default",
            price: priceMap[item.productId]
          }))
        }
      },
      include: {
        items: { include: { product: true } }
      }
    });

    // Clear user's cart (now completely separate)
    await tx.cartItem.deleteMany({
      where: { userId: orderData.userId }
    });

    return order;
  });

  // Serialize BigInts before returning
  return serializeBigInts(order);
};

export const addToCart = async (userId, productId, size, quantity = 1) => {
  const cartItem = await prisma.$transaction(async (tx) => {
    // Get product details and validate
    const product = await tx.product.findUnique({
      where: { id: Number(productId) },
      select: { id: true, price: true, stock: true, isActive: true, name: true }
    });

    if (!product) {
      throw new Error('Product not found');
    }

    if (!product.isActive) {
      throw new Error('Product is not available');
    }

    if (product.stock < quantity) {
      throw new Error(`Only ${product.stock} items available in stock`);
    }

    // Use upsert to handle existing cart items
    const cartItem = await tx.cartItem.upsert({
      where: {
        userId_productId_size: {
          userId: Number(userId),
          productId: Number(productId),
          size: size
        }
      },
      update: {
        quantity: {
          increment: quantity
        },
        price: product.price,
        updatedAt: new Date()
      },
      create: {
        userId: Number(userId),
        productId: Number(productId),
        size: size,
        quantity: quantity,
        price: product.price
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            image: true,
            price: true
          }
        }
      }
    });

    return cartItem;
  });

  // Serialize BigInts before returning
  return serializeBigInts(cartItem);
};

export const getAllOrders = async () => {
  const orders = await prisma.order.findMany({
    include: {
      items: { include: { product: true } },
      user: {
        select: { id: true, name: true, email: true, phoneNumber: true }
      },
    },
    orderBy: { date: 'desc' },
  });

  return serializeBigInts(orders);
};

export const getUserOrders = async (userId) => {
  const orders = await prisma.order.findMany({
    where: { userId: Number(userId) },
    include: { 
      items: { include: { product: true } }
    },
    orderBy: { date: 'desc' },
  });

  return serializeBigInts(orders);
};

export const updateOrderStatus = async (orderId, status) => {
  const validStatuses = ['ORDER_PLACED', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
  if (!validStatuses.includes(status)) {
    throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
  }

  const updatedOrder = await prisma.order.update({
    where: { id: Number(orderId) },
    data: { status },
    include: {
      items: { include: { product: true } }
    }
  });

  // Serialize BigInts before returning
  return serializeBigInts(updatedOrder);
};

// Additional helper functions you might need:

export const getCartItems = async (userId) => {
  const cartItems = await prisma.cartItem.findMany({
    where: { userId: Number(userId) },
    include: {
      product: {
        select: {
          id: true,
          name: true,
          image: true,
          price: true,
          stock: true,
          isActive: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  return serializeBigInts(cartItems);
};

export const removeFromCart = async (userId, cartItemId) => {
  const deletedItem = await prisma.cartItem.delete({
    where: {
      id: Number(cartItemId),
      userId: Number(userId) // Ensure user can only delete their own items
    },
    include: {
      product: {
        select: {
          id: true,
          name: true,
          image: true,
          price: true
        }
      }
    }
  });

  return serializeBigInts(deletedItem);
};

export const updateCartItemQuantity = async (userId, cartItemId, quantity) => {
  if (quantity <= 0) {
    // If quantity is 0 or negative, remove the item
    return await removeFromCart(userId, cartItemId);
  }

  const updatedItem = await prisma.cartItem.update({
    where: {
      id: Number(cartItemId),
      userId: Number(userId)
    },
    data: {
      quantity: quantity,
      updatedAt: new Date()
    },
    include: {
      product: {
        select: {
          id: true,
          name: true,
          image: true,
          price: true,
          stock: true
        }
      }
    }
  });

  return serializeBigInts(updatedItem);
};

export const clearCart = async (userId) => {
  const deletedItems = await prisma.cartItem.deleteMany({
    where: { userId: Number(userId) }
  });

  return { deletedCount: deletedItems.count };
};

export const getSingleOrder = async (orderId, userId = null) => {
  const whereClause = { id: Number(orderId) };
  
  // If userId is provided, ensure user can only access their own orders
  if (userId) {
    whereClause.userId = Number(userId);
  }

  const order = await prisma.order.findUnique({
    where: whereClause,
    include: {
      items: { 
        include: { 
          product: {
            select: {
              id: true,
              name: true,
              image: true,
              price: true,
              category: true,
              subCategory: true
            }
          }
        },
        orderBy: { id: 'asc' } // Consistent ordering
      },
      user: {
        select: { 
          id: true, 
          name: true, 
          email: true, 
          phoneNumber: true 
        }
      }
    }
  });

  if (!order) {
    throw new Error('Order not found');
  }

  // Serialize BigInts before returning
  return serializeBigInts(order);
};

