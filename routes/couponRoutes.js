import { Router } from "express";
import adminCouponController from "../controllers/adminCouponController.js";
import publicCouponController from "../controllers/couponController.js";
import userCouponController from "../controllers/userCouponController.js";
import { addItem, updateItem, removeItem, getCart } from "../controllers/cartController.js"; // Named imports
import { ensureRole, optionalAuth, ensureAuth } from "../middleware/authMiddleware.js";

const router = Router();

// Admin routes (require ADMIN role)
router.post("/admin/coupons", ensureAuth, ensureRole(["ADMIN"]), adminCouponController.createCoupon);
router.get("/admin/coupons", ensureAuth, ensureRole(["ADMIN"]), adminCouponController.listCoupons);
router.get("/admin/coupons/:id", ensureAuth, ensureRole(["ADMIN"]), adminCouponController.getCoupon);
router.put("/admin/coupons/:id", ensureAuth, ensureRole(["ADMIN"]), adminCouponController.updateCoupon);
router.delete("/admin/coupons/:id", ensureAuth, ensureRole(["ADMIN"]), adminCouponController.deleteCoupon);

// Public coupon endpoints (optional auth for user context)
router.post("/coupons/validate", optionalAuth, publicCouponController.validateCoupon);

// User-scoped coupon endpoints (require auth)
router.get("/user/coupons", ensureAuth, userCouponController.getUserCoupons);
router.post("/user/coupons/validate", ensureAuth, userCouponController.validateCouponForUser);

// Coupon-related cart operations (require auth)
router.post("/cart/apply-coupon", ensureAuth, userCouponController.applyCouponToCart);
router.delete("/cart/remove-coupon/:cartId", ensureAuth, userCouponController.removeCouponFromCart);

// Cart operations (require auth)
router.get("/cart", ensureAuth, getCart);
router.post("/cart/items", ensureAuth, addItem);
router.put("/cart/items/:cartItemId", ensureAuth, updateItem);
router.delete("/cart/items/:cartItemId", ensureAuth, removeItem);

export default router;