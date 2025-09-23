import * as couponService from '../services/couponService.js';

// Admin coupon controllers (mounted under /api/admin/coupons)
export const createCoupon = async (req, res, next) => {
  try {
    const created = await couponService.createCoupon(req.body);
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
};

export const listCoupons = async (req, res, next) => {
  try {
    const { page, limit, code, isActive, validFrom, validUntil } = req.query;
    const result = await couponService.listCoupons({ page, limit, filters: { code, isActive, validFrom, validUntil } });
    res.json(result);
  } catch (err) {
    next(err);
  }
};

export const getCoupon = async (req, res, next) => {
  try {
    const { id } = req.params;
    const coupon = await couponService.getCouponById(id);
    if (!coupon) return res.status(404).json({ error: 'NOT_FOUND', message: 'Coupon not found' });
    res.json(coupon);
  } catch (err) {
    next(err);
  }
};

export const updateCoupon = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updated = await couponService.updateCoupon(id, req.body);
    res.json(updated);
  } catch (err) {
    next(err);
  }
};

export const deleteCoupon = async (req, res, next) => {
  try {
    const { id } = req.params;
    await couponService.deleteCoupon(id);
    res.json({ deleted: true, id: Number(id) });
  } catch (err) {
    next(err);
  }
};

export default { createCoupon, listCoupons, getCoupon, updateCoupon, deleteCoupon };
