import * as couponService from '../services/couponService.js';

// --- Admin controllers ---
export const createCoupon = async (req, res, next) => {
  try {
    const created = await couponService.createCoupon(req.body);
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
};

// Admin get all coupons
export const getCoupons = async (req, res) => {
  try {
    const coupons = await couponService.getCouponsForAdmin();
    res.json({ success: true, data: coupons });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ================= NEW ================= //
export const getUserCoupons = async (req, res) => {
  try {
    const userId = req.user?.id; // assume auth middleware populates req.user
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const coupons = await couponService.getCouponsForUser(userId);
    res.json({ success: true, data: coupons });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getCouponById = async (req, res, next) => {
  try {
    const coupon = await couponService.getCouponById(req.params.id);
    if (!coupon) return res.status(404).json({ message: 'Coupon not found' });
    res.json(coupon);
  } catch (err) {
    next(err);
  }
};

export const updateCoupon = async (req, res, next) => {
  try {
    const updated = await couponService.updateCoupon(req.params.id, req.body);
    res.json(updated);
  } catch (err) {
    next(err);
  }
};

// --- User controllers ---
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
