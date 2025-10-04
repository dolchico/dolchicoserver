import * as cartService from "../services/cartService.js";
import { BadRequestError, NotFoundError, ValidationError } from "../utils/errors.js";
import { validate } from "uuid";

// Validate productId and size
const validateCartItemData = ({ productId, size, quantity }) => {
  if (!productId || !validate(productId)) {
    throw new ValidationError("Invalid or missing product ID.", "INVALID_PRODUCT_ID");
  }
  if (!size || typeof size !== "string" || size.length < 1 || size.length > 20) {
    throw new ValidationError("Size must be a string between 1 and 20 characters.", "INVALID_SIZE");
  }
  if (typeof quantity !== "number" || quantity < 1) {
    throw new ValidationError("Quantity must be a positive number.", "INVALID_QUANTITY");
  }
};

export const addItem = async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId, size, quantity = 1 } = req.body;

    if (!userId || !validate(userId)) {
      throw new BadRequestError("Invalid or missing user ID.", "INVALID_USER_ID");
    }

    // Parse productId to integer (handles string "168" or number 168)
    const productIdNumber = parseInt(productId, 10);
    if (isNaN(productIdNumber) || productIdNumber <= 0) {
      console.log('[CartController] Invalid productId received:', productId, 'parsed:', productIdNumber);
      throw new BadRequestError("Product ID is required and must be a valid integer", "INVALID_PRODUCT_ID");
    }

    // Parse quantity to integer
    const quantityNumber = parseInt(quantity, 10);
    if (isNaN(quantityNumber) || quantityNumber <= 0) {
      throw new BadRequestError("Quantity must be greater than 0", "INVALID_QUANTITY");
    }

    if (!size || typeof size !== 'string' || size.trim().length === 0) {
      throw new BadRequestError("Size is required", "INVALID_SIZE");
    }

    console.log(`[CartController] Received req.body:`, req.body);
    console.log(`[CartController] Adding item ${productIdNumber} (size: ${size}, quantity: ${quantityNumber}) to cart for user ${userId}`);

    const cartItem = await cartService.addItemToCart(userId, productIdNumber, size.trim(), quantityNumber);res.status(201).json({ success: true, message: "Item added to cart.", data: cartItem });
} catch (err) {
console.error(`[CartController] Error adding item to cart: ${err.message}`);
if (err instanceof BadRequestError || err instanceof ValidationError || err instanceof NotFoundError) {
return res.status(err.statusCode).json({ success: false, error: err.errorCode, message: err.message });
}
res.status(500).json({ success: false, error: "INTERNAL_ERROR", message: "An internal server error occurred." });
}
};

export const updateItem = async (req, res) => {
  try {
    const userId = req.user.id;
    const { cartItemId } = req.params;
    const { quantity } = req.body;

    if (!userId || !validate(userId)) {
      throw new BadRequestError("Invalid or missing user ID.", "INVALID_USER_ID");
    }
    if (!cartItemId || isNaN(parseInt(cartItemId, 10))) {
      throw new BadRequestError("Invalid or missing cart item ID.", "INVALID_CART_ITEM_ID");
    }
    if (typeof quantity !== "number" || quantity < 0) {
      throw new ValidationError("Quantity must be a non-negative number.", "INVALID_QUANTITY");
    }

    console.log(`[CartController] Updating cart item ${cartItemId} to quantity ${quantity} for user ${userId}`);
    const updatedItem = await cartService.updateCartItemQuantity(userId, parseInt(cartItemId, 10), quantity);

    res.status(200).json({ success: true, message: "Cart item updated.", data: updatedItem });
  } catch (err) {
    console.error(`[CartController] Error updating cart item: ${err.message}`);
    if (err instanceof BadRequestError || err instanceof ValidationError || err instanceof NotFoundError) {
      return res.status(err.statusCode).json({ success: false, error: err.errorCode, message: err.message });
    }
    res.status(500).json({ success: false, error: "INTERNAL_ERROR", message: "An internal server error occurred." });
  }
};

export const removeItem = async (req, res) => {
  try {
    const userId = req.user.id;
    const { cartItemId } = req.params;

    if (!userId || !validate(userId)) {
      throw new BadRequestError("Invalid or missing user ID.", "INVALID_USER_ID");
    }
    if (!cartItemId || isNaN(parseInt(cartItemId, 10))) {
      throw new BadRequestError("Invalid or missing cart item ID.", "INVALID_CART_ITEM_ID");
    }

    console.log(`[CartController] Removing cart item ${cartItemId} for user ${userId}`);
    await cartService.removeItemFromCart(userId, parseInt(cartItemId, 10));

    res.status(200).json({ success: true, message: "Item removed from cart." });
  } catch (err) {
    console.error(`[CartController] Error removing cart item: ${err.message}`);
    if (err instanceof BadRequestError || err instanceof NotFoundError) {
      return res.status(err.statusCode).json({ success: false, error: err.errorCode, message: err.message });
    }
    res.status(500).json({ success: false, error: "INTERNAL_ERROR", message: "An internal server error occurred." });
  }
};

export const getCart = async (req, res) => {
  try {
    const userId = req.user.id;

    if (!userId || !validate(userId)) {
      throw new BadRequestError("Invalid or missing user ID.", "INVALID_USER_ID");
    }

    console.log(`[CartController] Fetching cart for user ${userId}`);
    const cartData = await cartService.getCart(userId);

    res.status(200).json({ success: true, data: cartData });
  } catch (err) {
    console.error(`[CartController] Error fetching cart: ${err.message}`);
    if (err instanceof BadRequestError || err instanceof NotFoundError) {
      return res.status(err.statusCode).json({ success: false, error: err.errorCode, message: err.message });
    }
    res.status(500).json({ success: false, error: "INTERNAL_ERROR", message: "An internal server error occurred." });
  }
};