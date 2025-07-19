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
