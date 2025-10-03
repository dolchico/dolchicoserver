/**
 * The Service Layer for Cart functionality.
 * This file is responsible for all business logic related to the user's shopping cart.
 * It interacts directly with the database via Prisma and is completely independent of the
 * HTTP layer (it doesn't know about `req` or `res` objects).
 * It throws specific, custom errors that the controller can catch and interpret.
 */

import prisma from '../lib/prisma.js';
import { ValidationError, NotFoundError } from '../utils/errors.js';
import { priceUtils } from '../utils/priceUtils.js';

/**
 * Adds an item to a user's cart or increments its quantity if it already exists.
 * This function is transactional, meaning all database operations within it either
 * succeed together or fail together, preventing data inconsistency.
 *
 * @param {string} userId - The ID of the user owning the cart.
 * @param {number} productId - The ID of the product to add.
 * @param {string} size - The selected size of the product.
 * @param {number} quantity - The number of items to add.
 * @returns {Promise<object>} The created or updated cart item.
 * @throws {NotFoundError} If the product is not found.
 * @throws {ValidationError} If there is insufficient stock.
 */
export const addItemToCart = async (userId, productId, size, quantity) => {
  try {
    // Validate userId is a non-empty string
    if (!userId || typeof userId !== 'string') {
      throw new ValidationError('Invalid user ID');
    }

    // Validate productId is a positive integer
    const productIdNum = Number(productId);
    if (isNaN(productIdNum) || productIdNum <= 0 || !Number.isInteger(productIdNum)) {
      throw new ValidationError('Invalid product ID');
    }

    // Validate size is a non-empty string
    if (!size || typeof size !== 'string') {
      throw new ValidationError('Invalid size');
    }

    // Validate quantity is a positive integer
    const quantityNum = Number(quantity);
    if (isNaN(quantityNum) || quantityNum <= 0 || !Number.isInteger(quantityNum)) {
      throw new ValidationError('Invalid quantity');
    }

    // Check database connection
    if (!prisma) {
      throw new Error('Database connection not available');
    }

    return await prisma.$transaction(async (tx) => {
      // Step 1: Find the product to get its current price and stock level.
      const product = await tx.product.findUnique({ where: { id: productIdNum } });

      // If the product doesn't exist, throw a specific "Not Found" error.
      if (!product) {
        throw new NotFoundError('Product not found.');
      }

      // Step 2: Check if this exact item (same product and size) is already in the user's cart.
      const existingItem = await tx.cartItem.findUnique({
        where: { userId_productId_size: { userId, productId: productIdNum, size } },
      });

      // Step 3: Calculate the quantity that will be in the cart after this operation.
      const newQuantityInCart = existingItem ? existingItem.quantity + quantityNum : quantityNum;

      // Step 4: Validate stock. This is a critical business rule.
      if (product.stock < newQuantityInCart) {
        throw new ValidationError(`Not enough stock. Only ${product.stock} items available.`);
      }

      // Step 5: Use `upsert` to either create a new cart item or update an existing one.
      const cartItem = await tx.cartItem.upsert({
        where: { userId_productId_size: { userId, productId: productIdNum, size } },
        update: {
          quantity: { increment: quantityNum },
        },
        create: {
          userId,
          productId: productIdNum,
          size,
          quantity: quantityNum,
          price: product.price,
        },
      });

      return cartItem;
    });
  } catch (error) {
    console.error('Error adding item to cart:', error);
    throw error;
  }
};

/**
 * Updates the quantity of a specific item in the user's cart.
 * If the new quantity is 0, the item is removed from the cart.
 *
 * @param {string} userId - The ID of the user to ensure they own the cart item.
 * @param {number} cartItemId - The unique ID of the cart item to update.
 * @param {number} newQuantity - The new quantity for the item.
 * @returns {Promise<object | boolean>} The updated cart item, or true if deleted.
 * @throws {NotFoundError} If the cart item is not found or not owned by the user.
 * @throws {ValidationError} If there is insufficient stock or invalid input.
 */
export const updateCartItemQuantity = async (userId, cartItemId, newQuantity) => {
  try {
    // Validate userId is a non-empty string
    if (!userId || typeof userId !== 'string') {
      throw new ValidationError('Invalid user ID');
    }

    // Validate cartItemId is a positive integer
    const cartItemIdNum = Number(cartItemId);
    if (isNaN(cartItemIdNum) || cartItemIdNum <= 0 || !Number.isInteger(cartItemIdNum)) {
      throw new ValidationError('Invalid cart item ID');
    }

    // Validate newQuantity is a non-negative integer
    const newQuantityNum = Number(newQuantity);
    if (isNaN(newQuantityNum) || newQuantityNum < 0 || !Number.isInteger(newQuantityNum)) {
      throw new ValidationError('Invalid quantity');
    }

    // Check database connection
    if (!prisma) {
      throw new Error('Database connection not available');
    }

    // If the user sets the quantity to 0, treat it as a removal request.
    if (newQuantityNum === 0) {
      return await removeItemFromCart(userId, cartItemIdNum);
    }

    return await prisma.$transaction(async (tx) => {
      // Find the cart item, ensuring it belongs to the user.
      const cartItem = await tx.cartItem.findFirst({
        where: { id: cartItemIdNum, userId }, // Use string userId
        include: { product: true },
      });

      // If no item is found, it either doesn't exist or belongs to another user.
      if (!cartItem) {
        throw new NotFoundError('Cart item not found.');
      }

      // Validate stock against the new quantity.
      if (cartItem.product.stock < newQuantityNum) {
        throw new ValidationError(`Not enough stock. Only ${cartItem.product.stock} items available.`);
      }

      // Update the item's quantity.
      return await tx.cartItem.update({
        where: { id: cartItemIdNum },
        data: { quantity: newQuantityNum },
      });
    });
  } catch (error) {
    console.error('Error updating cart item quantity:', error);
    throw error;
  }
};

/**
 * Removes an item completely from the user's cart.
 *
 * @param {string} userId - The ID of the user.
 * @param {number} cartItemId - The ID of the cart item to remove.
 * @returns {Promise<boolean>} True if the deletion was successful.
 * @throws {NotFoundError} If the cart item is not found or not owned by the user.
 */
export const removeItemFromCart = async (userId, cartItemId) => {
  try {
    // Validate userId is a non-empty string
    if (!userId || typeof userId !== 'string') {
      throw new ValidationError('Invalid user ID');
    }

    // Validate cartItemId is a positive integer
    const cartItemIdNum = Number(cartItemId);
    if (isNaN(cartItemIdNum) || cartItemIdNum <= 0 || !Number.isInteger(cartItemIdNum)) {
      throw new ValidationError('Invalid cart item ID');
    }

    // Check database connection
    if (!prisma) {
      throw new Error('Database connection not available');
    }

    // Use `deleteMany` with userId check for security.
    const result = await prisma.cartItem.deleteMany({
      where: { id: cartItemIdNum, userId }, // Use string userId
    });

    // If no records were deleted, the item was not found or not owned by the user.
    if (result.count === 0) {
      throw new NotFoundError('Cart item not found or you do not have permission to remove it.');
    }

    return true;
  } catch (error) {
    console.error('Error removing item from cart:', error);
    throw error;
  }
};

/**
 * Retrieves the user's entire cart, including calculated totals.
 *
 * @param {string} userId - The ID of the user whose cart to fetch.
 * @returns {Promise<object>} An object containing the cart items and a summary of totals.
 * @throws {Error} If the database query fails.
 */
export const getCart = async (userId) => {
  try {
    // Validate userId is a non-empty string
    if (!userId || typeof userId !== 'string') {
      throw new ValidationError('Invalid user ID');
    }

    // Check database connection
    if (!prisma) {
      throw new Error('Database connection not available');
    }

    const cartItems = await prisma.cartItem.findMany({
      where: { userId }, // Use string userId
      include: {
        product: {
          select: { name: true, image: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate totals
    const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
    const subtotal = cartItems.reduce((sum, item) => priceUtils.add(sum, priceUtils.multiply(item.price, item.quantity)), 0);
    return {
items: cartItems,
summary: {
totalItems,
subtotal: priceUtils.toNumber(priceUtils.round(subtotal)),
},
};
} catch (error) {
console.error('Error fetching cart:', error);
throw error;
}
};