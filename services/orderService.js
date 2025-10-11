import prisma from '../lib/prisma.js';
import { serializeBigInts } from '../utils/serializeBigInt.js';
import { NotFoundError } from '../utils/errors.js'; // If not already imported

const REVIEW_TYPE = { PRODUCT: 'PRODUCT', DELIVERY: 'DELIVERY' };

/**
 * Creates an order with items and clears the user's cart.
 * @param {Object} orderData - Order data
 * @param {string} orderData.userId - The ID of the user
 * @param {Array} orderData.items - Array of items with productId, quantity, size
 * @param {number} orderData.amount - Total order amount
 * @param {Object} orderData.address - Shipping address
 * @returns {Promise<Object>} The created order
 * @throws {Error} If input is invalid or database operations fail
 */
export const createOrder = async (orderData) => {
  try {
    // Validate input
    if (!orderData || typeof orderData !== 'object') {
      throw new Error('Invalid order data');
    }
    const { userId, items, amount, address } = orderData;
    if (!userId || typeof userId !== 'string') {
      throw new Error('Invalid user ID');
    }
    if (!Array.isArray(items) || items.length === 0) {
      throw new Error('Items must be a non-empty array');
    }
    if (isNaN(amount) || amount <= 0) {
      throw new Error('Invalid amount');
    }
    if (!address || typeof address !== 'object') {
      throw new Error('Invalid address');
    }
    for (const item of items) {
      if (!Number.isInteger(item.productId) || item.productId <= 0) {
        throw new Error(`Invalid product ID: ${item.productId}`);
      }
      if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
        throw new Error(`Invalid quantity for product ${item.productId}`);
      }
      if (item.size && typeof item.size !== 'string') {
        throw new Error(`Invalid size for product ${item.productId}`);
      }
    }

    // Check database connection
    if (!prisma) {
      throw new Error('Database connection not available');
    }

    const order = await prisma.$transaction(async (tx) => {
      // Get product prices
      const productIds = items.map((item) => Number(item.productId));
      const products = await tx.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, price: true },
      });

      const priceMap = products.reduce((acc, product) => {
        acc[product.id] = product.price;
        return acc;
      }, {});

      // Validate all product IDs exist
      for (const item of items) {
        if (!priceMap[item.productId]) {
          throw new Error(`Product with ID ${item.productId} not found`);
        }
      }

      // Create order
      const order = await tx.order.create({
        data: {
          user: { connect: { id: userId } }, // Use string userId
          amount,
          address,
          paymentMethod: 'COD',
          payment: false,
          status: 'ORDER_PLACED',
          date: BigInt(Date.now()),
          items: {
            create: items.map((item) => ({
              product: { connect: { id: Number(item.productId) } },
              quantity: Number(item.quantity),
              size: item.size ?? 'Default',
              price: priceMap[item.productId],
            })),
          },
        },
        include: {
          items: { include: { product: true } },
        },
      });

      // Clear user's cart
      await tx.cartItem.deleteMany({
        where: { userId }, // Use string userId
      });

      return order;
    }, {
      maxWait: 10000,
      timeout: 15000,
    });

    return serializeBigInts(order);
  } catch (error) {
    console.error('Error creating order:', error);
    throw new Error(`Failed to create order: ${error.message}`);
  }
};

/**
 * Adds an item to the user's cart or updates its quantity.
 * @param {string} userId - The ID of the user
 * @param {number} productId - The ID of the product
 * @param {string} size - The size of the product
 * @param {number} [quantity=1] - The quantity to add
 * @returns {Promise<Object>} The created or updated cart item
 * @throws {Error} If input is invalid or product is unavailable
 */
export const addToCart = async (userId, productId, size, quantity) => {
  if (!validate(userId)) {
    throw new BadRequestError("Invalid user ID format.", "INVALID_USER_ID");
  }
  if (!productId || isNaN(productId) || productId <= 0) {
    console.log('[OrderService] Invalid productId in service:', productId);
    throw new BadRequestError("Invalid product ID", "INVALID_PRODUCT_ID");
  }
  if (!size || typeof size !== 'string' || size.trim().length === 0) {
    throw new BadRequestError("Size is required", "INVALID_SIZE");
  }
  if (isNaN(quantity) || quantity <= 0) {
    throw new BadRequestError("Quantity must be greater than 0", "INVALID_QUANTITY");
  }

  console.log('[OrderService] Processing cart add:', { userId, productId, size, quantity });

  const product = await prisma.product.findUnique({
    where: { id: productId },
  });
  if (!product) {
    throw new NotFoundError("Product not found", "PRODUCT_NOT_FOUND");
  }
  if (!product.sizes.includes(size)) {
    throw new BadRequestError("Invalid size for product", "INVALID_SIZE");
  }
  if (product.stock < quantity) {
    throw new BadRequestError("Insufficient stock", "INSUFFICIENT_STOCK");
  }

  const existingCartItem = await prisma.cartItem.findFirst({
    where: { userId, productId, size },
  });

  if (existingCartItem) {
    return prisma.cartItem.update({
      where: { id: existingCartItem.id },
      data: {
        quantity: existingCartItem.quantity + quantity,
        price: product.price,
      },
    });
  }

  return prisma.cartItem.create({
    data: {
      userId,
      productId,
      size,
      quantity,
      price: product.price,
    },
  });
};

/**
 * Retrieves all orders with user and item details.
 * @returns {Promise<Array>} Array of orders
 * @throws {Error} If query fails
 */
export const getAllOrders = async () => {
  try {
    // Check database connection
    if (!prisma) {
      throw new Error('Database connection not available');
    }

    const orders = await prisma.order.findMany({
      include: {
        items: { include: { product: true } },
        user: {
          select: { id: true, name: true, email: true, phoneNumber: true },
        },
      },
      orderBy: { date: 'desc' },
    });

    return serializeBigInts(orders);
  } catch (error) {
    console.error('Error fetching all orders:', error);
    throw new Error(`Failed to fetch orders: ${error.message}`);
  }
};

/**
 * Retrieves orders for a specific user.
 * @param {string} userId - The ID of the user
 * @returns {Promise<Array>} Array of user's orders
 * @throws {Error} If userId is invalid or query fails
 */
export const getUserOrders = async (userId) => {
  try {
    // Validate userId
    if (!userId || typeof userId !== 'string') {
      throw new Error('Invalid user ID');
    }

    // Check database connection
    if (!prisma) {
      throw new Error('Database connection not available');
    }

    const orders = await prisma.order.findMany({
      where: { userId }, // Use string userId
      include: {
        items: { include: { product: true } },
      },
      orderBy: { date: 'desc' },
    });

    return serializeBigInts(orders);
  } catch (error) {
    console.error('Error fetching user orders:', error);
    throw new Error(`Failed to fetch user orders: ${error.message}`);
  }
};

/**
 * Updates the status of an order.
 * @param {number} orderId - The ID of the order
 * @param {string} status - The new status
 * @returns {Promise<Object>} The updated order
 * @throws {Error} If orderId or status is invalid or update fails
 */
export const updateOrderStatus = async (orderId, status) => {
  try {
    // Validate inputs
    const orderIdNum = Number(orderId);
    if (isNaN(orderIdNum) || orderIdNum <= 0 || !Number.isInteger(orderIdNum)) {
      throw new Error('Invalid order ID');
    }
    const validStatuses = ['ORDER_PLACED', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }

    // Check database connection
    if (!prisma) {
      throw new Error('Database connection not available');
    }

    const updatedOrder = await prisma.order.update({
      where: { id: orderIdNum },
      data: { status },
      include: {
        items: { include: { product: true } },
      },
    });

    return serializeBigInts(updatedOrder);
  } catch (error) {
    console.error('Error updating order status:', error);
    throw new Error(`Failed to update order status: ${error.message}`);
  }
};

/**
 * Retrieves cart items for a user.
 * @param {string} userId - The ID of the user
 * @returns {Promise<Array>} Array of cart items
 * @throws {Error} If userId is invalid or query fails
 */
export const getCartItems = async (userId) => {
  try {
    // Validate userId
    if (!userId || typeof userId !== 'string') {
      throw new Error('Invalid user ID');
    }

    // Check database connection
    if (!prisma) {
      throw new Error('Database connection not available');
    }

    const cartItems = await prisma.cartItem.findMany({
      where: { userId }, // Use string userId
      include: {
        product: {
          select: {
            id: true,
            name: true,
            image: true,
            price: true,
            stock: true,
            isActive: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return serializeBigInts(cartItems);
  } catch (error) {
    console.error('Error fetching cart items:', error);
    throw new Error(`Failed to fetch cart items: ${error.message}`);
  }
};

/**
 * Removes an item from the user's cart.
 * @param {string} userId - The ID of the user
 * @param {number} cartItemId - The ID of the cart item
 * @returns {Promise<Object>} The deleted cart item
 * @throws {Error} If inputs are invalid or item not found
 */
export const removeFromCart = async (userId, cartItemId) => {
  try {
    // Validate inputs
    if (!userId || typeof userId !== 'string') {
      throw new Error('Invalid user ID');
    }
    const cartItemIdNum = Number(cartItemId);
    if (isNaN(cartItemIdNum) || cartItemIdNum <= 0 || !Number.isInteger(cartItemIdNum)) {
      throw new Error('Invalid cart item ID');
    }

    // Check database connection
    if (!prisma) {
      throw new Error('Database connection not available');
    }

    const deletedItem = await prisma.cartItem.delete({
      where: {
        id: cartItemIdNum,
        userId, // Use string userId
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            image: true,
            price: true,
          },
        },
      },
    });

    return serializeBigInts(deletedItem);
  } catch (error) {
    console.error('Error removing from cart:', error);
    throw new Error(`Failed to remove from cart: ${error.message}`);
  }
};

/**
 * Updates the quantity of a cart item.
 * @param {string} userId - The ID of the user
 * @param {number} cartItemId - The ID of the cart item
 * @param {number} quantity - The new quantity
 * @returns {Promise<Object>} The updated or deleted cart item
 * @throws {Error} If inputs are invalid or update fails
 */
export const updateCartItemQuantity = async (userId, cartItemId, quantity) => {
  try {
    // Validate inputs
    if (!userId || typeof userId !== 'string') {
      throw new Error('Invalid user ID');
    }
    const cartItemIdNum = Number(cartItemId);
    if (isNaN(cartItemIdNum) || cartItemIdNum <= 0 || !Number.isInteger(cartItemIdNum)) {
      throw new Error('Invalid cart item ID');
    }
    const quantityNum = Number(quantity);
    if (isNaN(quantityNum) || quantityNum < 0 || !Number.isInteger(quantityNum)) {
      throw new Error('Invalid quantity');
    }

    // Check database connection
    if (!prisma) {
      throw new Error('Database connection not available');
    }

    if (quantityNum <= 0) {
      return await removeFromCart(userId, cartItemIdNum);
    }

    const updatedItem = await prisma.cartItem.update({
      where: {
        id: cartItemIdNum,
        userId, // Use string userId
      },
      data: {
        quantity: quantityNum,
        updatedAt: new Date(),
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            image: true,
            price: true,
            stock: true,
          },
        },
      },
    });

    return serializeBigInts(updatedItem);
  } catch (error) {
    console.error('Error updating cart item quantity:', error);
    throw new Error(`Failed to update cart item quantity: ${error.message}`);
  }
};

/**
 * Clears all items from a user's cart.
 * @param {string} userId - The ID of the user
 * @returns {Promise<Object>} Object with deleted item count
 * @throws {Error} If userId is invalid or query fails
 */
export const clearCart = async (userId) => {
  try {
    // Validate userId
    if (!userId || typeof userId !== 'string') {
      throw new Error('Invalid user ID');
    }

    // Check database connection
    if (!prisma) {
      throw new Error('Database connection not available');
    }

    const deletedItems = await prisma.cartItem.deleteMany({
      where: { userId }, // Use string userId
    });

    return { deletedCount: deletedItems.count };
  } catch (error) {
    console.error('Error clearing cart:', error);
    throw new Error(`Failed to clear cart: ${error.message}`);
  }
};

/**
 * Retrieves a single order by ID with optional user authorization check.
 * @param {number} orderId - The ID of the order
 * @param {string} [userId] - The ID of the user (optional for admin access)
 * @returns {Promise<Object>} The order with details
 * @throws {Error} If orderId is invalid, order not found, or unauthorized
 */
export const getSingleOrder = async (orderId, userId = null) => {
  try {
    // Validate inputs
    const orderIdNum = Number(orderId);
    if (isNaN(orderIdNum) || orderIdNum <= 0 || !Number.isInteger(orderIdNum)) {
      throw new Error('Invalid order ID');
    }
    if (userId !== null && typeof userId !== 'string') {
      throw new Error('Invalid user ID');
    }

    // Check database connection
    if (!prisma) {
      throw new Error('Database connection not available');
    }

    const order = await prisma.order.findUnique({
      where: { id: orderIdNum },
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
                subCategory: true,
              },
            },
          },
          orderBy: { id: 'asc' },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phoneNumber: true,
          },
        },
      },
    });

    if (!order) {
      throw new Error('Order not found');
    }

    // Authorization check
    if (userId && order.userId !== userId) {
      throw new Error('Unauthorized: You can only view your own orders');
    }

    return serializeBigInts(order);
  } catch (error) {
    console.error('Error in getSingleOrder:', error);
    throw new Error(`Failed to fetch order: ${error.message}`);
  }
};

/**
 * Get User's Delivered Order Items with Products and Reviews
 */
export const getUserDeliveredProductsService = async (userId) => {
  try {
    // Validate userId
    if (!userId || typeof userId !== 'string') {
      throw new Error('Invalid user ID');
    }

    // Check database connection
    if (!prisma) {
      throw new Error('Database connection not available');
    }

    const orderItems = await prisma.orderItem.findMany({
      where: {
        order: {
          userId,
          status: 'DELIVERED'
        }
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            description: true,
            price: true,
            image: true,
            sizes: true,
            bestseller: true,
            isActive: true,
            stock: true,
            date: true,
            createdAt: true,
            updatedAt: true,
            category: {
              select: { name: true }
            },
            subcategory: {
              select: { name: true }
            }
          }
        },
        order: {
          select: {
            date: true
          }
        }
      },
      orderBy: [
        { order: { date: 'desc' } }
      ]
    });

    if (orderItems.length === 0) {
      return [];
    }

    const productIds = orderItems.map(oi => oi.productId);
    const reviews = await prisma.review.findMany({
      where: {
        userId,
        type: 'PRODUCT',
        isDeleted: false,
        productId: { in: productIds }
      }
    });

    const reviewMap = new Map(reviews.map(r => [r.productId, r]));

    const products = orderItems.map(oi => ({
      id: oi.id,
      product: {
        id: oi.product.id,
        name: oi.product.name,
        description: oi.product.description,
        price: oi.product.price.toNumber(),
        image: oi.product.image,
        category: oi.product.category?.name,
        subCategory: oi.product.subcategory?.name,
        sizes: oi.product.sizes,
        bestseller: oi.product.bestseller,
        isActive: oi.product.isActive,
        stock: oi.product.stock,
        date: oi.product.date.toString(),
        createdAt: oi.product.createdAt,
        updatedAt: oi.product.updatedAt
      },
      orderedDate: new Date(Number(oi.order.date)).toISOString().split('T')[0],
      size: oi.size,
      quantity: oi.quantity,
      review: reviewMap.get(oi.productId) || undefined
    }));

    return serializeBigInts(products);
  } catch (error) {
    console.error('Error fetching user delivered products:', error);
    throw new Error(`Failed to fetch delivered products: ${error.message}`);
  }
};





