const express = require('express');
const router = express.Router();
const controller = require('../controllers/couponController');

router.post('/api/admin/coupons', controller.createCoupon);
router.post('/api/coupons/validate', controller.validateCoupon);
router.post('/api/cart/apply-coupon', controller.applyCoupon);
router.delete('/api/cart/remove-coupon/:cartId', controller.removeCoupon);

module.exports = router;
