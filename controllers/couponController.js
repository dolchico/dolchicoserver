import * as couponService from '../services/couponService.js';

// Public/legacy endpoint: validate coupon (accepts optional userId in body)
export const validateCoupon = async (req, res, next) => {
  try {
    const { userId, code, cartTotal, categoryIds } = req.body;
    const result = await couponService.validateCoupon({ userId, code, cartTotal, categoryIds });
    res.json(result);
  } catch (err) {
    next(err);
  }
};

export default { validateCoupon };
    res.json(list);
