import prisma from '../lib/prisma.js';
import { Prisma } from '@prisma/client';

const REVIEW_TYPE = { PRODUCT: 'PRODUCT', DELIVERY: 'DELIVERY' };

const recalcProductAggregates = async (productId, tx) => {
  if (!productId) return;
  const agg = await tx.review.aggregate({ where: { productId, type: REVIEW_TYPE.PRODUCT, isDeleted: false }, _avg: { rating: true }, _count: { rating: true } });
  const avg = agg._avg.rating;
  const count = agg._count.rating || 0;
  await tx.product.update({ where: { id: productId }, data: { averageRating: avg === null ? 0 : avg, reviewsCount: count } });
};

// deliveryAgent aggregates removed — delivery agents are not tracked in schema

// Helper removed - now using single id strategy

const createReview = async (dto, userId) => {
  return prisma.$transaction(async (tx) => {
    if (dto.type === REVIEW_TYPE.PRODUCT) {
      if (!dto.productId) throw { status: 400, message: 'productId required for PRODUCT reviews' };
      const purchased = await tx.orderItem.findFirst({ where: { productId: dto.productId, order: { userId, status: { not: 'CANCELLED' } } } });
      if (!purchased) throw { status: 422, message: 'User has not purchased this product' };
    }
    if (dto.type === REVIEW_TYPE.DELIVERY) {
      if (!dto.orderId) throw { status: 400, message: 'orderId required for DELIVERY reviews' };
      const order = await tx.order.findUnique({ where: { id: dto.orderId } });
      if (!order) throw { status: 404, message: 'Order not found' };
      if (order.userId !== userId) throw { status: 403, message: 'Not order owner' };
      if (order.status !== 'DELIVERED') throw { status: 422, message: 'Order not delivered yet' };
    }
    const createData = {
      userId,
      type: dto.type,
      productId: dto.productId || null,
      orderId: dto.orderId || null,
  // deliveryAgentId removed
      rating: dto.rating,
      title: dto.title || null,
      comment: dto.comment || null,
      images: dto.images || [],
      metadata: dto.metadata || null
    };
    try {
      const review = await tx.review.create({ data: createData });
      if (dto.type === REVIEW_TYPE.PRODUCT && dto.productId) await recalcProductAggregates(dto.productId, tx);
  // deliveryAgent aggregation removed
      return review;
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') throw { status: 409, message: 'Review already exists' };
      throw err;
    }
  });
};

const updateReview = async (id, dto, userCtx) => {
  return prisma.$transaction(async (tx) => {
  const existing = await tx.review.findUnique({ where: { id } });
    if (!existing) throw { status: 404, message: 'Review not found' };
    if (existing.isDeleted) throw { status: 404, message: 'Review not found' };
    if (existing.userId !== userCtx.id && userCtx.role !== 'ADMIN' && userCtx.role !== 'MODERATOR') throw { status: 403, message: 'Forbidden' };
    const data = {};
    if (dto.rating !== undefined) data.rating = dto.rating;
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.comment !== undefined) data.comment = dto.comment;
    if (dto.images !== undefined) data.images = dto.images;
    if (Object.keys(data).length === 0) return existing;
    data.isEdited = true;
    const updated = await tx.review.update({ where: { id: existing.id }, data });
    if (existing.type === 'PRODUCT' && existing.productId) await recalcProductAggregates(existing.productId, tx);
  // deliveryAgent aggregation removed
    return updated;
  });
};

const deleteReview = async (id, userCtx) => {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.review.findUnique({ where: { id } });
    if (!existing) throw { status: 404, message: 'Review not found' };
    if (existing.userId !== userCtx.id && userCtx.role !== 'ADMIN' && userCtx.role !== 'MODERATOR') throw { status: 403, message: 'Forbidden' };
    if (existing.isDeleted) return { success: true };
    await tx.review.update({ where: { id: existing.id }, data: { isDeleted: true } });
    if (existing.type === 'PRODUCT' && existing.productId) await recalcProductAggregates(existing.productId, tx);
  // deliveryAgent aggregation removed
    return { success: true };
  });
};

const getReviewById = async (id, userCtx) => {
  const review = await prisma.review.findUnique({ where: { id } });
  if (!review) throw { status: 404, message: 'Review not found' };
  if (review.isDeleted && !(userCtx && (userCtx.id === review.userId || userCtx.role === 'ADMIN' || userCtx.role === 'MODERATOR'))) throw { status: 404, message: 'Review not found' };
  return review;
};

const listReviews = async (filters, pagination) => {
  const where = {};
  if (filters.type) where.type = filters.type;
  if (filters.productId) where.productId = Number(filters.productId);
  if (filters.orderId) where.orderId = Number(filters.orderId);
  // deliveryAgentId filter removed
  if (filters.userId) where.userId = Number(filters.userId);
  if (filters.rating) where.rating = Number(filters.rating);
  if (filters.minRating) where.rating = { gte: Number(filters.minRating) };
  if (filters.maxRating) where.rating = { ...(where.rating || {}), lte: Number(filters.maxRating) };
  if (filters.hasImages !== undefined) where.images = filters.hasImages ? { not: [] } : { equals: [] };
  if (filters.fromDate || filters.toDate) where.createdAt = {};
  if (filters.fromDate) where.createdAt.gte = new Date(filters.fromDate);
  if (filters.toDate) where.createdAt.lte = new Date(filters.toDate);
  if (!filters.includeDeleted) where.isDeleted = false;
  const page = pagination.page || 1;
  const pageSize = pagination.pageSize || 20;
  const skip = (page - 1) * pageSize;
  const order = {};
  if (pagination.sort) {
    const [field, dir] = pagination.sort.split('_');
    order[field] = dir === 'asc' ? 'asc' : 'desc';
  } else {
    order.createdAt = 'desc';
  }
  const [items, total] = await Promise.all([
    prisma.review.findMany({ where, skip, take: pageSize, orderBy: order }),
    prisma.review.count({ where })
  ]);
  return { items, pageInfo: { page, pageSize, total, hasNextPage: page * pageSize < total } };
};

const getProductSummary = async (productId) => {
  const agg = await prisma.review.aggregate({ where: { productId, type: REVIEW_TYPE.PRODUCT, isDeleted: false }, _avg: { rating: true }, _count: { rating: true }, _sum: { rating: true } });
  const distributionRaw = await prisma.$queryRaw`SELECT rating, COUNT(*) FROM reviews WHERE "productId" = ${productId} AND type = 'PRODUCT' AND NOT "isDeleted" GROUP BY rating`;
  const distribution = { 1:0,2:0,3:0,4:0,5:0 };
  for (const row of distributionRaw) distribution[row.rating] = Number(row.count);
  return { averageRating: agg._avg.rating || 0, reviewsCount: agg._count.rating || 0, distribution };
};

// getDeliveryAgentSummary removed — delivery agents not tracked

export default { createReview, updateReview, deleteReview, getReviewById, listReviews, getProductSummary };
