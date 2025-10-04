import * as couponService from "../services/couponService.js";
import { BadRequestError, NotFoundError, UnauthorizedError, ValidationError } from "../utils/errors.js";
import { validate } from "uuid";

// Validate coupon code format
const validateCouponCode = (code) => {
  if (!code || typeof code !== "string" || code.length < 3 || code.length > 20) {
    throw new ValidationError("Coupon code must be a string between 3 and 20 characters.", "INVALID_COUPON_CODE");
  }
};

// Validate category IDs
const validateCategoryIds = (categoryIds) => {
  if (!Array.isArray(categoryIds)) {
    throw new ValidationError("categoryIds must be an array.", "INVALID_CATEGORY_IDS");
  }
  for (const id of categoryIds) {
    if (!validate(id)) {
      throw new ValidationError(`Invalid category ID: ${id}.`, "INVALID_CATEGORY_ID");
    }
  }
};

export const getUserCoupons = async (req, res) => {
  try {
    const userId = req.user && (req.user.id || req.user.userId);
    if (!userId || !validate(userId)) {
      throw new UnauthorizedError("Invalid or missing user ID.", "UNAUTHENTICATED");
    }

    console.log(`[CouponController] Fetching coupons for user ${userId}`);
    const coupons = await couponService.getCouponsForUser(userId);

    res.status(200).json({ success: true, data: coupons });
  } catch (err) {
    console.error(`[CouponController] Error fetching coupons: ${err.message}`);
    if (err instanceof BadRequestError || err instanceof NotFoundError || err instanceof UnauthorizedError || err instanceof ValidationError) {
      return res.status(err.statusCode).json({ success: false, error: err.errorCode, message: err.message });
    }
    return res.status(500).json({ success: false, error: "INTERNAL_ERROR", message: "An internal server error occurred." });
  }
};

export const validateCouponForUser = async (req, res) => {
  try {
    const userId = req.user && (req.user.id || req.user.userId);
    const { code, cartTotal, categoryIds } = req.body;

    if (!userId || !validate(userId)) {
      throw new UnauthorizedError("Invalid or missing user ID.", "UNAUTHENTICATED");
    }
    validateCouponCode(code);
    if (typeof cartTotal !== "number" || cartTotal < 0) {
      throw new ValidationError("cartTotal must be a non-negative number.", "INVALID_CART_TOTAL");
    }
    if (categoryIds && !Array.isArray(categoryIds)) {
      throw new ValidationError("categoryIds must be an array.", "INVALID_CATEGORY_IDS");
    }
    if (categoryIds) {
      validateCategoryIds(categoryIds);
    }

    console.log(`[CouponController] Validating coupon ${code} for user ${userId}`);
    const result = await couponService.validateCoupon({ userId, code, cartTotal, categoryIds });

    res.status(200).json({ success: true, ...result });
  } catch (err) {
    console.error(`[CouponController] Error validating coupon: ${err.message}`);
    if (err instanceof BadRequestError || err instanceof NotFoundError || err instanceof UnauthorizedError || err instanceof ValidationError) {
      return res.status(err.statusCode).json({ success: false, error: err.errorCode, message: err.message });
    }
    return res.status(500).json({ success: false, error: "INTERNAL_ERROR", message: "An internal server error occurred." });
  }
};

export const applyCouponToCart = async (req, res) => {
  try {
    const userId = req.user && (req.user.id || req.user.userId) || req.body.userId;
    const { cartId, code } = req.body;

    if (!userId || !validate(userId)) {
      throw new BadRequestError("Invalid or missing user ID.", "INVALID_USER_ID");
    }
    if (!cartId || !validate(cartId)) {
      throw new BadRequestError("Invalid or missing cart ID.", "INVALID_CART_ID");
    }
    validateCouponCode(code);

    console.log(`[CouponController] Applying coupon ${code} to cart ${cartId} for user ${userId}`);
    const result = await couponService.applyCoupon({ userId, cartId, code });

    res.status(200).json({ success: true, message: "Coupon applied successfully.", ...result });
  } catch (err) {
    console.error(`[CouponController] Error applying coupon: ${err.message}`);
    if (err instanceof BadRequestError || err instanceof NotFoundError || err instanceof UnauthorizedError || err instanceof ValidationError) {
      return res.status(err.statusCode).json({ success: false, error: err.errorCode, message: err.message });
    }
    return res.status(500).json({ success: false, error: "INTERNAL_ERROR", message: "An internal server error occurred." });
  }
};

export const removeCouponFromCart = async (req, res) => {
  try {
    const { cartId } = req.params;
    const userId = req.user?.id;

    if (!userId || !validate(userId)) {
      throw new BadRequestError("Invalid or missing user ID.", "INVALID_USER_ID");
    }
    if (!cartId || !validate(cartId)) {
      throw new BadRequestError("Invalid or missing cart ID.", "INVALID_CART_ID");
    }

    console.log(`[CouponController] Removing coupon from cart ${cartId} for user ${userId}`);
    const result = await couponService.removeCoupon({ cartId, userId });

    res.status(200).json({ success: true, message: "Coupon removed successfully.", ...result });
  } catch (err) {
    console.error(`[CouponController] Error removing coupon: ${err.message}`);
    if (err instanceof BadRequestError || err instanceof NotFoundError || err instanceof UnauthorizedError || err instanceof ValidationError) {
      return res.status(err.statusCode).json({ success: false, error: err.errorCode, message: err.message });
    }
    return res.status(500).json({ success: false, error: "INTERNAL_ERROR", message: "An internal server error occurred." });
  }
};

export default { getUserCoupons, validateCouponForUser, applyCouponToCart, removeCouponFromCart };