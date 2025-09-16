import { Router } from 'express';
import * as couponController from '../controllers/couponController.js';


const router = Router();

// Admin route: POST /api/admin/coupons (mounted under /api in server.js)
router.post('/admin/coupons', couponController.createCoupon);

// Public/user routes: POST /api/coupons/validate, POST /api/cart/apply-coupon, DELETE /api/cart/remove-coupon/:cartId
router.post('/coupons/validate', couponController.validateCoupon);
router.post('/cart/apply-coupon', couponController.applyCoupon);
router.delete('/cart/remove-coupon/:cartId', couponController.removeCoupon);

export default router;
