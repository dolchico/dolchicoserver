import * as couponService from '../services/couponService.js';

export const getUserCoupons = async (req, res, next) => {
  try {
    const userId = req.user && (req.user.id || req.user.userId);
    if (!userId) return res.status(401).json({ error: 'UNAUTHENTICATED', message: 'Authentication required' });
    const coupons = await couponService.getCouponsForUser(userId);
    res.json({ data: coupons });
  } catch (err) {
    next(err);
  }
};

export const validateCouponForUser = async (req, res, next) => {
  try {
    const userId = req.user && (req.user.id || req.user.userId);
    if (!userId) return res.status(401).json({ error: 'UNAUTHENTICATED', message: 'Authentication required' });
    const { code, cartTotal, categoryIds } = req.body;
    const result = await couponService.validateCoupon({ userId, code, cartTotal, categoryIds });
    res.json(result);
  } catch (err) {
    next(err);
  }
};

export default { getUserCoupons, validateCouponForUser };
