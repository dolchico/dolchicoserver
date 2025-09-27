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
 * @param {number} userId - The ID of the user owning the cart.
 * @param {number} productId - The ID of the product to add.
 * @param {string} size - The selected size of the product.
 * @param {number} quantity - The number of items to add.
 * @returns {Promise<object>} The created or updated cart item.
 */
export const addItemToCart = async (userId, productId, size, quantity) => {
  // Use a Prisma transaction to ensure atomicity. If any step fails (e.g., stock check),
  // the entire operation is rolled back, leaving the database in its original state.
  // This is crucial for preventing race conditions where stock could be double-booked.
  return prisma.$transaction(async (tx) => {
    // Step 1: Find the product to get its current price and stock level.
    const product = await tx.product.findUnique({ where: { id: productId } });

    // If the product doesn't exist, throw a specific "Not Found" error.
    if (!product) {
      throw new NotFoundError('Product not found.');
    }

    // Step 2: Check if this exact item (same product and size) is already in the user's cart.
    // We use `findUnique` on the `@@unique([userId, productId, size])` constraint from our schema.
    const existingItem = await tx.cartItem.findUnique({
      where: { userId_productId_size: { userId, productId, size } },
    });

    // Step 3: Calculate the quantity that will be in the cart after this operation.
    const newQuantityInCart = existingItem ? existingItem.quantity + quantity : quantity;

    // Step 4: Validate stock. This is a critical business rule.
    if (product.stock < newQuantityInCart) {
      throw new ValidationError(`Not enough stock. Only ${product.stock} items available.`);
    }

    // Step 5: Use `upsert` to either create a new cart item or update an existing one.
    // `upsert` is a powerful Prisma operation that combines "update" and "insert".
    const cartItem = await tx.cartItem.upsert({
      // The `where` clause identifies the item to update.
      where: { userId_productId_size: { userId, productId, size } },
      // The `update` block is executed if the item is found. We simply increment the quantity.
      update: {
        quantity: { increment: quantity },
      },
      // The `create` block is executed if the item is NOT found.
      create: {
        userId,
        productId,
        size,
        quantity,
        // CRITICAL: We "snapshot" the product's price at the moment it's added.
        // This ensures that if the product price changes later, the user's cart total remains correct.
        price: product.price,
      },
    });

    return cartItem;
  });
};

/**
 * Updates the quantity of a specific item in the user's cart.
 * If the new quantity is 0, the item is removed from the cart.
 *
 * @param {number} userId - The ID of the user to ensure they own the cart item.
 * @param {number} cartItemId - The unique ID of the cart item to update.
 * @param {number} newQuantity - The new quantity for the item.
 * @returns {Promise<object | boolean>} The updated cart item, or true if deleted.
 */
export const updateCartItemQuantity = async (userId, cartItemId, newQuantity) => {
  // If the user sets the quantity to 0, we treat it as a removal request.
  if (newQuantity === 0) {
    return removeItemFromCart(userId, cartItemId);
  }

  // Use a transaction for consistency when checking stock and updating.
  return prisma.$transaction(async (tx) => {
    // Find the cart item, but also check that it belongs to the current user.
    // This is a CRITICAL security check to prevent one user from modifying another's cart.
    const cartItem = await tx.cartItem.findFirst({
      where: { id: cartItemId, userId: userId }, // Both conditions must be met.
      include: { product: true }, // We need the product to check its stock.
    });

    // If no item is found, it either doesn't exist or belongs to another user.
    if (!cartItem) {
      throw new NotFoundError('Cart item not found.');
    }

    // Validate stock against the new quantity.
    if (cartItem.product.stock < newQuantity) {
      throw new ValidationError(`Not enough stock. Only ${cartItem.product.stock} items available.`);
    }

    // If all checks pass, update the item's quantity.
    return await tx.cartItem.update({
      where: { id: cartItemId },
      data: { quantity: newQuantity },
    });
  });
};

/**
 * Removes an item completely from the user's cart.
 *
 * @param {number} userId - The ID of the user.
 * @param {number} cartItemId - The ID of the cart item to remove.
 * @returns {Promise<boolean>} True if the deletion was successful.
 */
export const removeItemFromCart = async (userId, cartItemId) => {
  // Use `deleteMany` with a `where` clause that includes the userId.
  // This is another security check to ensure a user can only delete their own items.
  const result = await prisma.cartItem.deleteMany({
    where: { id: cartItemId, userId: userId },
  });

  // `deleteMany` returns a `count` of the number of records deleted.
  // If the count is 0, it means no item matched the criteria (was not found or not owned by the user).
  if (result.count === 0) {
    throw new NotFoundError('Cart item not found or you do not have permission to remove it.');
  }

  return true;
};

/**
 * Retrieves the user's entire cart, including calculated totals.
 *
 * @param {number} userId - The ID of the user whose cart to fetch.
 * @returns {Promise<object>} An object containing the cart items and a summary of totals.
 */
export const getCart = async (userId) => {
  const cartItems = await prisma.cartItem.findMany({
    where: { userId },
    include: {
      // We include related product data but use `select` to only fetch the fields
      // the frontend actually needs. This reduces the API payload size and is more efficient.
      product: {
        select: { name: true, image: true }, // Assuming 'image' is a field on your Product model
      },
    },
    // Order the items by creation date so the newest items appear first.
    orderBy: { createdAt: 'desc' },
  });

  // Perform calculations on the server, not the client, for a single source of truth.
  // Calculate the total number of items (e.g., 2 shirts + 1 hat = 3).
  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  // Calculate the subtotal based on the price snapshot in each cart item.
  const subtotal = cartItems.reduce((sum, item) => priceUtils.add(sum, priceUtils.multiply(item.price, item.quantity)), 0);

  // Return a structured object for the frontend.
  return {
    items: cartItems,
    summary: {
      totalItems,
      // Format the subtotal to two decimal places using Decimal.
      subtotal: priceUtils.toNumber(priceUtils.round(subtotal)),
    },
  };
};
