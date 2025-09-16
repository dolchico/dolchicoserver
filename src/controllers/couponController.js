const couponService = require('../services/couponService');

async function createCoupon(req, res, next) {
  try {
    const created = await couponService.createCoupon(req.body);
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
}

async function validateCoupon(req, res, next) {
  try {
    const { userId, code, cartTotal, categoryIds } = req.body;
    const result = await couponService.validateCoupon({ userId, code, cartTotal, categoryIds });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function applyCoupon(req, res, next) {
  try {
    const { userId, cartId, code } = req.body;
    const result = await couponService.applyCoupon({ userId, cartId, code });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function removeCoupon(req, res, next) {
  try {
    const { cartId } = req.params;
    const result = await couponService.removeCoupon({ cartId });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = { createCoupon, validateCoupon, applyCoupon, removeCoupon };
