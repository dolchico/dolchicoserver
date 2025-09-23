import prisma from '../lib/prisma.js';
import { Prisma } from '@prisma/client';

function toDecimal(value) {
  if (value === null || typeof value === 'undefined') return null;
  return new Prisma.Decimal(value);
}

// ============ CREATE ============ //
export async function createCoupon(data) {
  const payload = {
    code: data.code,
    name: data.name,
    type: data.type,
    discountValue: toDecimal(data.discountValue),
    minOrderValue: toDecimal(data.minOrderValue),
    maxDiscountAmount: toDecimal(data.maxDiscountAmount),
    usageLimitTotal: data.usageLimitTotal || null,
    usageLimitPerUser: data.usageLimitPerUser || null,
    validFrom: new Date(data.validFrom),
    validUntil: new Date(data.validUntil),
    isActive: data.isActive !== false,
    isNewUserOnly: !!data.isNewUserOnly,
    categoryIds: data.categoryIds || null,
    userId: data.userIds && data.userIds.length === 1 ? data.userIds[0] : null
  };

  return prisma.coupon.create({ data: payload });
}



// ============ GET COUPONS (ADMIN) ============ //
export async function getCouponsForAdmin() {
  return prisma.coupon.findMany({
    orderBy: { createdAt: 'desc' }
  });
}

// ============ GET COUPONS (USER) ============ //
export async function getCouponsForUser(userId) {
  if (!userId) {
    throw new Error('CUSTOMER_USER_ID_REQUIRED');
  }

  const now = new Date();

  // Public coupons (active & valid)
  const publicCoupons = await prisma.coupon.findMany({
    where: {
      isActive: true,
      validFrom: { lte: now },
      validUntil: { gte: now }
    },
    orderBy: { createdAt: 'desc' }
  });

  // User-specific coupons (via UserCoupon join table)
  const userCoupons = await prisma.coupon.findMany({
    where: {
      userCoupons: {
        some: { userId }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  // Merge & deduplicate
  const map = new Map();
  [...publicCoupons, ...userCoupons].forEach(c => map.set(c.id, c));

  return Array.from(map.values());
}

// ============ VALIDATE / APPLY / REMOVE ============ //
export async function validateCoupon({ userId, code, cartTotal, categoryIds }) {
  const coupon = await prisma.coupon.findUnique({ where: { code } });
  if (!coupon) return { valid: false, reason: 'NOT_FOUND' };
  if (!coupon.isActive) return { valid: false, reason: 'INACTIVE' };

  const now = new Date();
  if (now < coupon.validFrom) return { valid: false, reason: 'NOT_STARTED' };
  if (now > coupon.validUntil) return { valid: false, reason: 'EXPIRED' };

  if (coupon.minOrderValue) {
    const cartDec = new Prisma.Decimal(cartTotal);
    if (cartDec.lessThan(coupon.minOrderValue)) {
      return { valid: false, reason: 'MIN_ORDER_NOT_MET' };
    }
  }

  if (coupon.categoryIds && Array.isArray(coupon.categoryIds) && Array.isArray(categoryIds)) {
    const allowed = coupon.categoryIds;
    const intersect = categoryIds.filter(id => allowed.includes(id));
    if (intersect.length === 0) return { valid: false, reason: 'CATEGORY_MISMATCH' };
  }

  if (coupon.usageLimitTotal) {
    const totalUsed = await prisma.couponUsage.count({ where: { couponId: coupon.id } });
    if (totalUsed >= coupon.usageLimitTotal) {
      return { valid: false, reason: 'USAGE_LIMIT_EXCEEDED' };
    }
  }
  if (userId && coupon.usageLimitPerUser) {
    const userUsed = await prisma.couponUsage.count({ where: { couponId: coupon.id, userId } });
    if (userUsed >= coupon.usageLimitPerUser) {
      return { valid: false, reason: 'USER_USAGE_LIMIT_EXCEEDED' };
    }
  }

  // compute discount
  const cartDecimal = new Prisma.Decimal(cartTotal);
  let discount = new Prisma.Decimal(0);
  if (coupon.type === 'PERCENTAGE') {
    discount = cartDecimal.mul(coupon.discountValue).div(new Prisma.Decimal(100));
  } else {
    discount = new Prisma.Decimal(coupon.discountValue);
  }
  if (coupon.maxDiscountAmount) {
    discount = discount.greaterThan(coupon.maxDiscountAmount)
      ? coupon.maxDiscountAmount
      : discount;
  }

  return { valid: true, discount: discount.toString() };
}

export async function applyCoupon({ userId, cartId, code }) {
  return prisma.$transaction(async (tx) => {
    const coupon = await tx.coupon.findUnique({ where: { code } });
    if (!coupon) throw new Error('NOT_FOUND');
    const now = new Date();
    if (!coupon.isActive || now < coupon.validFrom || now > coupon.validUntil) {
      throw new Error('INVALID');
    }

    if (coupon.usageLimitTotal) {
      const totalUsed = await tx.couponUsage.count({ where: { couponId: coupon.id } });
      if (totalUsed >= coupon.usageLimitTotal) throw new Error('USAGE_LIMIT_EXCEEDED');
    }
    if (userId && coupon.usageLimitPerUser) {
      const userUsed = await tx.couponUsage.count({ where: { couponId: coupon.id, userId } });
      if (userUsed >= coupon.usageLimitPerUser) throw new Error('USER_USAGE_LIMIT_EXCEEDED');
    }

    const usage = await tx.couponUsage.create({
      data: { couponId: coupon.id, userId, orderId: null }
    });
    return { reservedUsageId: usage.id, couponId: coupon.id };
  });
}

export async function removeCoupon({ cartId }) {
  // No cart->coupon mapping in schema; noop for now
  return { removed: true };
}

export default {
  createCoupon,
  getCouponsForAdmin,
  getCouponsForUser,
  validateCoupon,
  applyCoupon,
  removeCoupon
};
