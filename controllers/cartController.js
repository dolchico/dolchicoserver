import * as couponService from '../services/couponService.js';

export const applyCouponToCart = async (req, res, next) => {
  try {
    const userId = req.user && (req.user.id || req.user.userId) || req.body.userId;
    const { cartId, code } = req.body;
    if (!cartId || !code) return res.status(400).json({ error: 'INVALID_PAYLOAD', message: 'cartId and code are required' });
    const result = await couponService.applyCoupon({ userId, cartId, code });
    console.log(result);
    res.json(result);
  } catch (err) {
    // translate known errors
    if (err.message === 'NOT_FOUND') return res.status(404).json({ error: 'NOT_FOUND', message: 'Coupon not found' });
    if (err.message === 'USAGE_LIMIT_EXCEEDED') return res.status(409).json({ error: 'USAGE_LIMIT_EXCEEDED', message: 'Coupon fully redeemed' });
    if (err.message === 'USER_USAGE_LIMIT_EXCEEDED') return res.status(409).json({ error: 'USER_USAGE_LIMIT_EXCEEDED', message: 'User limit exceeded' });
    next(err);
  }
};

export const removeCouponFromCart = async (req, res, next) => {
  try {
    const { cartId } = req.params;
    console.log('Removing coupon for cartId:', cartId);

    // Validate cartId
    if (!cartId) {
      console.log('Missing cartId');
      return res.status(400).json({ error: 'INVALID_PAYLOAD', message: 'cartId required' });
    }

    // Assume couponService.removeCoupon implementation
    const result = await couponService.removeCoupon({ cartId, userId: req.user?.id });
    console.log('couponService.removeCoupon result:', result);

    // Ensure consistent success response
    res.json({ success: true, message: 'Coupon removed successfully', ...result });
  } catch (err) {
    console.error('Error in removeCouponFromCart:', err.message, err.stack);
    // Map specific errors to appropriate responses
    if (err.message === 'Cart not found') {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Cart not found' });
    }
    if (err.message === 'No coupon applied') {
      return res.status(400).json({ error: 'NO_COUPON_APPLIED', message: 'No coupon is applied to this cart' });
    }
    if (err.message === 'Unauthorized') {
      return res.status(401).json({ error: 'UNAUTHORIZED', message: 'User not authorized to modify this cart' });
    }
    // Fallback for unhandled errors
    next(err);
  }
};

export default { applyCouponToCart, removeCouponFromCart };
/**
 * The Controller Layer for Cart functionality.
 * This file acts as the "traffic cop" between the HTTP world and our application's business logic.
 *
 * Its responsibilities are:
 *   1. Handling the `req` (request) and `res` (response) objects.
 *   2. Extracting data from the request (body, params, and the user ID from auth middleware).
 *   3. Performing basic input validation.
 *   4. Calling the appropriate service function to do the real work.
 *   5. Catching errors from the service and sending back a formatted, secure HTTP response.
 */

import * as cartService from '../services/cartService.js';
import { ValidationError, NotFoundError } from '../utils/errors.js';

// Controller for `POST /api/cart/items`
export const addItem = async (req, res) => {
  try {
    // 1. Extract data:
    // `req.user.id` is populated by our `authUser` middleware, ensuring we know who is making the request.
    const userId = req.user.id;
    // Get product details from the request body. Default quantity to 1 if not provided.
    const { productId, size, quantity = 1 } = req.body;

    // 2. Validate input:
    // This is the first line of defense against invalid data.
    if (!productId || !size) {
      throw new ValidationError('Product ID and size are required.');
    }
    if (typeof quantity !== 'number' || quantity < 1) {
      throw new ValidationError('Quantity must be a positive number.');
    }

    // 3. Call the service:
    // Delegate the complex business logic to the service layer.
    const cartItem = await cartService.addItemToCart(userId, productId, size, quantity);

    // 4. Send success response:
    // Use HTTP status 201 Created, as a new resource (or an update) was made.
    res.status(201).json({ success: true, message: 'Item added to cart.', data: cartItem });
  } catch (err) {
    // 5. Handle errors securely:
    // Check if the error is one of our custom, "safe" error types.
    if (err instanceof ValidationError || err instanceof NotFoundError) {
      // If so, use its status code and message for the response.
      return res.status(err.statusCode).json({ success: false, message: err.message });
    }
    // For any other unexpected error, log it for debugging...
    console.error('Add to Cart Controller Error:', err);
    // ...and send a generic 500 Internal Server Error response to the client.
    // This prevents leaking sensitive internal details.
    res.status(500).json({ success: false, message: 'An internal server error occurred.' });
  }
};

// Controller for `PUT /api/cart/items/:cartItemId`
export const updateItem = async (req, res) => {
  try {
    const userId = req.user.id;
    // `:cartItemId` from the URL is available in `req.params`.
    const { cartItemId } = req.params;
    const { quantity } = req.body;

    // Validate the quantity. A value of 0 is allowed, as it signifies deletion.
    if (typeof quantity !== 'number' || quantity < 0) {
      throw new ValidationError('Quantity must be a non-negative number.');
    }

    const updatedItem = await cartService.updateCartItemQuantity(userId, Number(cartItemId), quantity);
    // Use HTTP status 200 OK for a successful update.
    res.status(200).json({ success: true, message: 'Cart item updated.', data: updatedItem });
  } catch (err) {
    // Same robust error handling as above.
    if (err instanceof ValidationError || err instanceof NotFoundError) {
      return res.status(err.statusCode).json({ success: false, message: err.message });
    }
    console.error('Update Cart Controller Error:', err);
    res.status(500).json({ success: false, message: 'An internal server error occurred.' });
  }
};

// Controller for `DELETE /api/cart/items/:cartItemId`
export const removeItem = async (req, res) => {
  try {
    const userId = req.user.id;
    const { cartItemId } = req.params;

    await cartService.removeItemFromCart(userId, Number(cartItemId));
    // A successful deletion also gets a 200 OK. Some APIs use 204 No Content. 200 is fine.
    res.status(200).json({ success: true, message: 'Item removed from cart.' });
  } catch (err) {
    // This action can primarily only fail if the item is not found.
    if (err instanceof NotFoundError) {
      return res.status(err.statusCode).json({ success: false, message: err.message });
    }
    console.error('Remove from Cart Controller Error:', err);
    res.status(500).json({ success: false, message: 'An internal server error occurred.' });
  }
};

// Controller for `GET /api/cart`
export const getCart = async (req, res) => {
  try {
    const userId = req.user.id;
    const cartData = await cartService.getCart(userId);
    // A successful retrieval gets a 200 OK.
    res.status(200).json({ success: true, data: cartData });
  } catch (err) {
    // This action is unlikely to fail with a "safe" error, so we primarily handle server errors.
    console.error('Get Cart Controller Error:', err);
    res.status(500).json({ success: false, message: 'An internal server error occurred.' });
  }
};
