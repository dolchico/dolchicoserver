import { Router } from 'express';
import * as couponController from '../controllers/couponController.js';

const router = Router();

// ============ ADMIN ROUTES ============ //
// Admin route: POST /api/admin/coupons (mounted under /api in server.js)
router.post('/admin/coupons', couponController.createCoupon);
router.get('/admin/coupons', couponController.getCoupons);       // all coupons for admin
router.get('/admin/coupons/:id', couponController.getCouponById);
router.put('/admin/coupons/:id', couponController.updateCoupon);

// ============ USER ROUTES ============ //
// Public/user routes
router.get('/coupons', couponController.getUserCoupons);         // <-- NEW GET for user
router.post('/coupons/validate', couponController.validateCoupon);
router.post('/cart/apply-coupon', couponController.applyCoupon);
router.delete('/cart/remove-coupon/:cartId', couponController.removeCoupon);

export default router;
