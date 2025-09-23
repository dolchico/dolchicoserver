import { Router } from 'express';
import adminCouponController from '../controllers/adminCouponController.js';
import publicCouponController from '../controllers/couponController.js';
import userCouponController from '../controllers/userCouponController.js';
import cartController from '../controllers/cartController.js';
import auth, { ensureRole, optionalAuth, ensureAuth } from '../middleware/authMiddleware.js';

const router = Router();

// Admin routes (require ADMIN role)
router.post('/admin/coupons', auth.ensureAuth, auth.ensureRole(['ADMIN']), adminCouponController.createCoupon);
router.get('/admin/coupons', auth.ensureAuth, auth.ensureRole(['ADMIN']), adminCouponController.listCoupons);
router.get('/admin/coupons/:id', auth.ensureAuth, auth.ensureRole(['ADMIN']), adminCouponController.getCoupon);
router.put('/admin/coupons/:id', auth.ensureAuth, auth.ensureRole(['ADMIN']), adminCouponController.updateCoupon);
router.delete('/admin/coupons/:id', auth.ensureAuth, auth.ensureRole(['ADMIN']), adminCouponController.deleteCoupon);

// Public coupon endpoints (optional auth for user context)
router.post('/coupons/validate', optionalAuth, publicCouponController.validateCoupon);

// Cart operations (require auth)
router.post('/cart/apply-coupon', auth.ensureAuth, cartController.applyCouponToCart);
router.delete('/cart/remove-coupon/:cartId', auth.ensureAuth, cartController.removeCouponFromCart);

// User-scoped coupon endpoints (require auth)
router.get('/user/coupons', auth.ensureAuth, userCouponController.getUserCoupons);
router.post('/user/coupons/validate', auth.ensureAuth, userCouponController.validateCouponForUser);

export default router;
