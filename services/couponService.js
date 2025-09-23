import prisma from '../lib/prisma.js';
import { Prisma } from '@prisma/client';

function toDecimal(value) {
  if (value === null || typeof value === 'undefined') return null;
  return new Prisma.Decimal(value);
}

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
    categoryIds: data.categoryIds || null
  };

  // If specific userIds provided, create assignments in nested create
  if (Array.isArray(data.userIds) && data.userIds.length > 0) {
    payload.assignments = {
      create: data.userIds.map((uid) => ({ userId: uid }))
    };
  }

  return prisma.coupon.create({ data: payload, include: { assignments: true } });
}

export async function listCoupons(options = {}) {
  const { page = 1, limit = 25, filters = {} } = options;
  const where = {};

  if (typeof filters.code !== 'undefined' && filters.code !== null) {
    where.code = { contains: String(filters.code), mode: 'insensitive' };
  }

  if (typeof filters.isActive !== 'undefined' && filters.isActive !== null) {
    where.isActive = filters.isActive === 'true' || filters.isActive === true;
  }

  if (filters.validFrom) {
    where.validFrom = { gte: new Date(filters.validFrom) };
  }

  if (filters.validUntil) {
    where.validUntil = { lte: new Date(filters.validUntil) };
  }

  const total = await prisma.coupon.count({ where });
  const take = Math.max(1, Number(limit) || 25);
  const skip = (Math.max(1, Number(page) || 1) - 1) * take;

  const data = await prisma.coupon.findMany({
    where,
    include: { assignments: true },
    orderBy: { createdAt: 'desc' },
    skip,
    take
  });

  const pagination = { page: Number(page), limit: take, total, pages: Math.ceil(total / take) };
  return { data, pagination };
}

export async function getCouponById(id) {
  return prisma.coupon.findUnique({ where: { id: Number(id) }, include: { assignments: true } });
}

export async function updateCoupon(id, data) {
  const payload = {};
  if (data.code) payload.code = data.code;
  if (data.name) payload.name = data.name;
  if (data.type) payload.type = data.type;
  if (typeof data.discountValue !== 'undefined') payload.discountValue = toDecimal(data.discountValue);
  if (typeof data.minOrderValue !== 'undefined') payload.minOrderValue = toDecimal(data.minOrderValue);
  if (typeof data.maxDiscountAmount !== 'undefined') payload.maxDiscountAmount = toDecimal(data.maxDiscountAmount);
  if (typeof data.usageLimitTotal !== 'undefined') payload.usageLimitTotal = data.usageLimitTotal;
  if (typeof data.usageLimitPerUser !== 'undefined') payload.usageLimitPerUser = data.usageLimitPerUser;
  if (typeof data.validFrom !== 'undefined') payload.validFrom = new Date(data.validFrom);
  if (typeof data.validUntil !== 'undefined') payload.validUntil = new Date(data.validUntil);
  if (typeof data.isActive !== 'undefined') payload.isActive = data.isActive;
  if (typeof data.isNewUserOnly !== 'undefined') payload.isNewUserOnly = data.isNewUserOnly;
  if (typeof data.categoryIds !== 'undefined') payload.categoryIds = data.categoryIds;

  return prisma.$transaction(async (tx) => {
    // First update coupon fields
    const updated = await tx.coupon.update({ where: { id: Number(id) }, data: payload });

    // If userIds present, sync assignments: remove existing not in list, add new ones
    if (Array.isArray(data.userIds)) {
      // Delete assignments for this coupon that are not in provided list
      await tx.couponAssignment.deleteMany({ where: { couponId: Number(id), NOT: { userId: { in: data.userIds } } } });

      // Upsert provided assignments (create if not exist)
      for (const uid of data.userIds) {
        await tx.couponAssignment.upsert({
          where: { couponId_userId: { couponId: Number(id), userId: uid } },
          update: {},
          create: { couponId: Number(id), userId: uid }
        });
      }
    }

    const result = await tx.coupon.findUnique({ where: { id: Number(id) }, include: { assignments: true } });
    return result;
  });
}

export async function deleteCoupon(id) {
  return prisma.coupon.delete({ where: { id: Number(id) } });
}

export async function validateCoupon({ userId, code, cartTotal, categoryIds }) {
  // include assignments to check whether coupon is global or user-specific
  const coupon = await prisma.coupon.findUnique({ where: { code }, include: { assignments: true } });
  if (!coupon) return { valid: false, reason: 'NOT_FOUND' };
  if (!coupon.isActive) return { valid: false, reason: 'INACTIVE' };

  const now = new Date();
  if (now < coupon.validFrom) return { valid: false, reason: 'NOT_STARTED' };
  if (now > coupon.validUntil) return { valid: false, reason: 'EXPIRED' };

  if (coupon.minOrderValue) {
    const cartDec = new Prisma.Decimal(cartTotal);
    if (cartDec.lessThan(coupon.minOrderValue)) return { valid: false, reason: 'MIN_ORDER_NOT_MET' };
  }

  if (coupon.categoryIds && Array.isArray(coupon.categoryIds) && Array.isArray(categoryIds)) {
    const allowed = coupon.categoryIds;
    const intersect = categoryIds.filter(id => allowed.includes(id));
    if (intersect.length === 0) return { valid: false, reason: 'CATEGORY_MISMATCH' };
  }

  if (coupon.usageLimitTotal) {
    const totalUsed = await prisma.couponUsage.count({ where: { couponId: coupon.id } });
    if (totalUsed >= coupon.usageLimitTotal) return { valid: false, reason: 'USAGE_LIMIT_EXCEEDED' };
  }
  // If coupon has specific assignments, ensure user is assigned
  if (Array.isArray(coupon.assignments) && coupon.assignments.length > 0) {
    const assignedUserIds = coupon.assignments.map(a => a.userId);
    if (!userId || !assignedUserIds.includes(Number(userId))) return { valid: false, reason: 'NOT_ASSIGNED' };
  }

  if (userId && coupon.usageLimitPerUser) {
    const userUsed = await prisma.couponUsage.count({ where: { couponId: coupon.id, userId } });
    if (userUsed >= coupon.usageLimitPerUser) return { valid: false, reason: 'USER_USAGE_LIMIT_EXCEEDED' };
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
    discount = discount.greaterThan(coupon.maxDiscountAmount) ? coupon.maxDiscountAmount : discount;
  }

  return { valid: true, discount: discount.toString() };
}

export async function getCouponsForUser(userId) {
  // fetch coupons that are active and either global (no assignments) or assigned to user
  const now = new Date();
  const coupons = await prisma.coupon.findMany({
    where: {
      isActive: true,
      validFrom: { lte: now },
      validUntil: { gte: now },
      OR: [
        { assignments: { none: {} } },
        { assignments: { some: { userId: Number(userId) } } }
      ]
    },
    include: { assignments: true }
  });
  return coupons;
}

export async function applyCoupon({ userId, cartId, code }) {
  return prisma.$transaction(async (tx) => {
    const coupon = await tx.coupon.findUnique({ where: { code } });
    if (!coupon) throw new Error('NOT_FOUND');
    const now = new Date();
    if (!coupon.isActive || now < coupon.validFrom || now > coupon.validUntil) throw new Error('INVALID');

    if (coupon.usageLimitTotal) {
      const totalUsed = await tx.couponUsage.count({ where: { couponId: coupon.id } });
      if (totalUsed >= coupon.usageLimitTotal) throw new Error('USAGE_LIMIT_EXCEEDED');
    }
    if (userId && coupon.usageLimitPerUser) {
      const userUsed = await tx.couponUsage.count({ where: { couponId: coupon.id, userId } });
      if (userUsed >= coupon.usageLimitPerUser) throw new Error('USER_USAGE_LIMIT_EXCEEDED');
    }

    const usage = await tx.couponUsage.create({ data: { couponId: coupon.id, userId, orderId: null } });
    return { reservedUsageId: usage.id, couponId: coupon.id };
  });
}

export async function removeCoupon({ cartId }) {
  // No cart->coupon mapping in schema; noop for now
  return { removed: true };
}

export default { createCoupon, validateCoupon, applyCoupon, removeCoupon };
