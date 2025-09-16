import * as couponService from '../services/couponService.js';

export const createCoupon = async (req, res, next) => {
  try {
    const created = await couponService.createCoupon(req.body);
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
};

export const validateCoupon = async (req, res, next) => {
  try {
    const { userId, code, cartTotal, categoryIds } = req.body;
    const result = await couponService.validateCoupon({ userId, code, cartTotal, categoryIds });
    res.json(result);
  } catch (err) {
    next(err);
  }
};

export const applyCoupon = async (req, res, next) => {
  try {
    const { userId, cartId, code } = req.body;
    const result = await couponService.applyCoupon({ userId, cartId, code });
    res.json(result);
  } catch (err) {
    next(err);
  }
};

export const removeCoupon = async (req, res, next) => {
  try {
    const { cartId } = req.params;
    const result = await couponService.removeCoupon({ cartId });
    res.json(result);
  } catch (err) {
    next(err);
  }
};
