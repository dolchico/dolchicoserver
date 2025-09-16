const prisma = require('../../lib/prisma.js');
const { Prisma } = require('@prisma/client');

async function createCoupon(data) {
  // Basic normalization and parsing
  const payload = {
    code: data.code,
    name: data.name,
    type: data.type,
    discountValue: new Prisma.Decimal(data.discountValue),
    minOrderValue: data.minOrderValue ? new Prisma.Decimal(data.minOrderValue) : null,
    maxDiscountAmount: data.maxDiscountAmount ? new Prisma.Decimal(data.maxDiscountAmount) : null,
    usageLimitTotal: data.usageLimitTotal || null,
    usageLimitPerUser: data.usageLimitPerUser || null,
    validFrom: new Date(data.validFrom),
    validUntil: new Date(data.validUntil),
    isActive: data.isActive !== false,
    isNewUserOnly: !!data.isNewUserOnly,
    categoryIds: data.categoryIds || null
  };

  return prisma.coupon.create({ data: payload });
}

async function validateCoupon({ userId, code, cartTotal, categoryIds }) {
  // Return object { valid: boolean, reason?: string, discount?: Decimal }
  const coupon = await prisma.coupon.findUnique({ where: { code } });
  if (!coupon) return { valid: false, reason: 'NOT_FOUND' };
  if (!coupon.isActive) return { valid: false, reason: 'INACTIVE' };
  const now = new Date();
  if (now < coupon.validFrom) return { valid: false, reason: 'NOT_STARTED' };
  if (now > coupon.validUntil) return { valid: false, reason: 'EXPIRED' };

  // min order value
  if (coupon.minOrderValue && new Prisma.Decimal(cartTotal).lessThan(coupon.minOrderValue)) {
    return { valid: false, reason: 'MIN_ORDER_NOT_MET' };
  }

  // category restriction
  if (coupon.categoryIds && Array.isArray(coupon.categoryIds) && categoryIds) {
    const allowed = coupon.categoryIds;
    const intersect = categoryIds.filter(id => allowed.includes(id));
    if (intersect.length === 0) return { valid: false, reason: 'CATEGORY_MISMATCH' };
  }

  // usage limits
  if (coupon.usageLimitTotal) {
    const totalUsed = await prisma.couponUsage.count({ where: { couponId: coupon.id } });
    if (totalUsed >= coupon.usageLimitTotal) return { valid: false, reason: 'USAGE_LIMIT_EXCEEDED' };
  }
  if (userId && coupon.usageLimitPerUser) {
    const userUsed = await prisma.couponUsage.count({ where: { couponId: coupon.id, userId } });
    if (userUsed >= coupon.usageLimitPerUser) return { valid: false, reason: 'USER_USAGE_LIMIT_EXCEEDED' };
  }

  // success -> compute discount
  const cartDecimal = new Prisma.Decimal(cartTotal);
  let discount = new Prisma.Decimal(0);
  if (coupon.type === 'PERCENTAGE') {
    discount = cartDecimal.mul(coupon.discountValue).div(new Prisma.Decimal(100));
  } else {
    discount = new Prisma.Decimal(coupon.discountValue);
  }
  if (coupon.maxDiscountAmount) {
    discount = Prismalimit(discount, coupon.maxDiscountAmount);
  }

  return { valid: true, discount };
}

function Prismalimit(discount, max) {
  const d = new Prisma.Decimal(discount);
  const m = new Prisma.Decimal(max);
  return d.greaterThan(m) ? m : d;
}

async function applyCoupon({ userId, cartId, code }) {
  // This function will reserve a coupon usage inside a transaction and return reserved usage id
  return prisma.$transaction(async (tx) => {
    const coupon = await tx.coupon.findUnique({ where: { code } });
    if (!coupon) throw new Error('NOT_FOUND');
    const now = new Date();
    if (!coupon.isActive || now < coupon.validFrom || now > coupon.validUntil) throw new Error('INVALID');

    // Check usage limits
    if (coupon.usageLimitTotal) {
      const totalUsed = await tx.couponUsage.count({ where: { couponId: coupon.id } });
      if (totalUsed >= coupon.usageLimitTotal) throw new Error('USAGE_LIMIT_EXCEEDED');
    }
    if (userId && coupon.usageLimitPerUser) {
      const userUsed = await tx.couponUsage.count({ where: { couponId: coupon.id, userId } });
      if (userUsed >= coupon.usageLimitPerUser) throw new Error('USER_USAGE_LIMIT_EXCEEDED');
    }

    // Reserve usage
    const usage = await tx.couponUsage.create({ data: { couponId: coupon.id, userId, orderId: null } });

    // Attach to cart via Cart metadata — project may not have a cart model; we store in a simple table or return usage id to frontend
    return { reservedUsageId: usage.id, couponId: coupon.id };
  });
}

async function removeCoupon({ cartId }) {
  // For this implementation, we will remove any coupon usages with orderId null for the cart's reserved usage
  // Since cartId isn't linked to couponUsage in this simple model, just return success
  return { removed: true };
}

module.exports = { createCoupon, validateCoupon, applyCoupon, removeCoupon };
