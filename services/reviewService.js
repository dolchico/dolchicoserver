import prisma from '../lib/prisma.js';
import { Prisma } from '@prisma/client';

const REVIEW_TYPE = { PRODUCT: 'PRODUCT', DELIVERY: 'DELIVERY' };

/**
 * Recalculates product rating aggregates and updates the product (only APPROVED reviews).
 * @param {number} productId - The ID of the product
 * @param {Object} tx - Prisma transaction client
 * @returns {Promise<void>}
 * @throws {Error} If productId is invalid or database operation fails
 */
const recalcProductAggregates = async (productId, tx) => {
  try {
    // Validate productId
    const productIdNum = Number(productId);
    if (isNaN(productIdNum) || productIdNum <= 0 || !Number.isInteger(productIdNum)) {
      throw new Error('Invalid product ID');
    }

    // Use provided transaction client
    const agg = await tx.review.aggregate({
      where: { productId: productIdNum, type: REVIEW_TYPE.PRODUCT, isDeleted: false, status: 'APPROVED' },
      _avg: { rating: true },
      _count: { rating: true },
    });
    const avg = agg._avg.rating;
    const count = agg._count.rating || 0;
    await tx.product.update({
      where: { id: productIdNum },
      data: { averageRating: avg === null ? 0 : avg, reviewsCount: count },
    });
  } catch (error) {
    console.error('Error recalculating product aggregates:', error);
    throw new Error(`Failed to recalculate product aggregates: ${error.message}`);
  }
};

/**
 * Creates a review for a product or delivery.
 * @param {Object} dto - Review data
 * @param {string} userId - The ID of the user (UUID)
 * @returns {Promise<Object>} The created review
 * @throws {Error} If input is invalid or database operation fails
 */
const createReview = async (dto, userId) => {
  try {
    // Parse numeric fields first
    const productIdNum = dto.productId ? Number(dto.productId) : null;
    const orderIdNum = dto.orderId ? Number(dto.orderId) : null;
    const ratingNum = Number(dto.rating);

    // Validate inputs
    if (!dto || typeof dto !== 'object') {
      throw new Error('Invalid review data');
    }
    if (!userId || typeof userId !== 'string') {
      throw new Error('Invalid user ID');
    }
    if (!Object.values(REVIEW_TYPE).includes(dto.type)) {
      throw new Error(`Invalid review type. Must be one of: ${Object.values(REVIEW_TYPE).join(', ')}`);
    }
    if (isNaN(ratingNum) || !Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      throw new Error('Invalid rating: must be an integer between 1 and 5');
    }
    if (dto.title && typeof dto.title !== 'string') {
      throw new Error('Invalid title: must be a string');
    }
    if (dto.comment && typeof dto.comment !== 'string') {
      throw new Error('Invalid comment: must be a string');
    }
    if (dto.images && (!Array.isArray(dto.images) || dto.images.some(img => typeof img !== 'string'))) {
      throw new Error('Invalid images: must be an array of strings');
    }

    // Check database connection
    if (!prisma) {
      throw new Error('Database connection not available');
    }

    return await prisma.$transaction(async (tx) => {
      if (dto.type === REVIEW_TYPE.PRODUCT) {
        if (!productIdNum || isNaN(productIdNum) || productIdNum <= 0 || !Number.isInteger(productIdNum)) {
          throw { status: 400, message: 'Invalid productId for PRODUCT reviews' };
        }
        const purchased = await tx.orderItem.findFirst({
          where: { productId: productIdNum, order: { userId, status: { not: 'CANCELLED' } } },
        });
        if (!purchased) {
          throw { status: 422, message: 'User has not purchased this product' };
        }
      }
      if (dto.type === REVIEW_TYPE.DELIVERY) {
        if (!orderIdNum || isNaN(orderIdNum) || orderIdNum <= 0 || !Number.isInteger(orderIdNum)) {
          throw { status: 400, message: 'Invalid orderId for DELIVERY reviews' };
        }
        const order = await tx.order.findUnique({ where: { id: orderIdNum } });
        if (!order) {
          throw { status: 404, message: 'Order not found' };
        }
        if (order.userId !== userId) {
          throw { status: 403, message: 'Not order owner' };
        }
        if (order.status !== 'DELIVERED') {
          throw { status: 422, message: 'Order not delivered yet' };
        }
      }

      const createData = {
        userId, // Use string userId
        type: dto.type,
        productId: productIdNum,
        orderId: orderIdNum,
        rating: ratingNum,
        title: dto.title || null,
        comment: dto.comment || null,
        images: dto.images || [],
        metadata: dto.metadata || null,
        status: 'PENDING',
      };

      try {
        const review = await tx.review.create({ data: createData });
        if (dto.type === REVIEW_TYPE.PRODUCT && productIdNum) {
          await recalcProductAggregates(productIdNum, tx);
        }
        return review;
      } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
          throw { status: 409, message: 'Review already exists' };
        }
        throw err;
      }
    });
  } catch (error) {
    console.error('Error creating review:', error);
    throw error.status ? error : new Error(`Failed to create review: ${error.message}`);
  }
};

/**
 * Updates a review.
 * @param {string} id - The ID of the review (string)
 * @param {Object} dto - Update data
 * @param {Object} userCtx - User context with id and role
 * @returns {Promise<Object>} The updated review
 * @throws {Error} If input is invalid or update fails
 */
const updateReview = async (id, dto, userCtx) => {
  try {
    // Validate ID as string
    if (typeof id !== 'string' || id.length === 0) {
      throw { status: 400, message: 'Invalid review ID' };
    }

    // Normalize numeric fields
    const ratingNum = dto.rating !== undefined ? Number(dto.rating) : undefined;

    // Validate inputs
    if (!dto || typeof dto !== 'object') {
      throw { status: 400, message: 'Invalid update data' };
    }
    if (!userCtx || typeof userCtx !== 'object' || !userCtx.id || typeof userCtx.id !== 'string') {
      throw { status: 400, message: 'Invalid user context' };
    }
    if (dto.rating !== undefined && (isNaN(ratingNum) || !Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5)) {
      throw { status: 400, message: 'Invalid rating: must be an integer between 1 and 5' };
    }
    if (dto.title !== undefined && typeof dto.title !== 'string') {
      throw { status: 400, message: 'Invalid title: must be a string' };
    }
    if (dto.comment !== undefined && typeof dto.comment !== 'string') {
      throw { status: 400, message: 'Invalid comment: must be a string' };
    }
    if (dto.images !== undefined && (!Array.isArray(dto.images) || dto.images.some(img => typeof img !== 'string'))) {
      throw { status: 400, message: 'Invalid images: must be an array of strings' };
    }

    // Check database connection
    if (!prisma) {
      throw { status: 500, message: 'Database connection not available' };
    }

    return await prisma.$transaction(async (tx) => {
      const existing = await tx.review.findUnique({ where: { id } });
      if (!existing) {
        throw { status: 404, message: 'Review not found' };
      }
      if (existing.isDeleted) {
        throw { status: 404, message: 'Review not found' };
      }
      if (existing.userId !== userCtx.id && userCtx.role !== 'ADMIN' && userCtx.role !== 'MODERATOR') {
        throw { status: 403, message: 'Forbidden' };
      }

      const data = {};
      if (dto.rating !== undefined) data.rating = ratingNum;
      if (dto.title !== undefined) data.title = dto.title;
      if (dto.comment !== undefined) data.comment = dto.comment;
      if (dto.images !== undefined) data.images = dto.images;
      if (Object.keys(data).length === 0) {
        return existing;
      }
      data.isEdited = true;

      const updated = await tx.review.update({ where: { id }, data });
      if (existing.type === REVIEW_TYPE.PRODUCT && existing.productId) {
        await recalcProductAggregates(existing.productId, tx);
      }
      return updated;
    });
  } catch (error) {
    console.error('Error updating review:', error);
    throw error.status ? error : new Error(`Failed to update review: ${error.message}`);
  }
};

/**
 * Deletes a review (soft delete).
 * @param {string} id - The ID of the review (string)
 * @param {Object} userCtx - User context with id and role
 * @returns {Promise<Object>} Success response
 * @throws {Error} If input is invalid or deletion fails
 */
const deleteReview = async (id, userCtx) => {
  try {
    // Validate inputs
    if (typeof id !== 'string' || id.length === 0) {
      throw { status: 400, message: 'Invalid review ID' };
    }
    if (!userCtx || typeof userCtx !== 'object' || !userCtx.id || typeof userCtx.id !== 'string') {
      throw { status: 400, message: 'Invalid user context' };
    }

    // Check database connection
    if (!prisma) {
      throw { status: 500, message: 'Database connection not available' };
    }

    return await prisma.$transaction(async (tx) => {
      const existing = await tx.review.findUnique({ where: { id } });
      if (!existing) {
        throw { status: 404, message: 'Review not found' };
      }
      if (existing.userId !== userCtx.id && userCtx.role !== 'ADMIN' && userCtx.role !== 'MODERATOR') {
        throw { status: 403, message: 'Forbidden' };
      }
      if (existing.isDeleted) {
        return { success: true };
      }

      await tx.review.update({ where: { id }, data: { isDeleted: true } });
      if (existing.type === REVIEW_TYPE.PRODUCT && existing.productId) {
        await recalcProductAggregates(existing.productId, tx);
      }
      return { success: true };
    });
  } catch (error) {
    console.error('Error deleting review:', error);
    throw error.status ? error : new Error(`Failed to delete review: ${error.message}`);
  }
};

/**
 * Retrieves a review by ID.
 * @param {string} id - The ID of the review (string)
 * @param {Object} userCtx - User context with id and role
 * @returns {Promise<Object>} The review
 * @throws {Error} If input is invalid or review not found
 */
const getReviewById = async (id, userCtx) => {
  try {
    // Validate inputs
    if (typeof id !== 'string' || id.length === 0) {
      throw { status: 400, message: 'Invalid review ID' };
    }
    if (userCtx && (typeof userCtx !== 'object' || !userCtx.id || typeof userCtx.id !== 'string')) {
      throw { status: 400, message: 'Invalid user context' };
    }

    // Check database connection
    if (!prisma) {
      throw { status: 500, message: 'Database connection not available' };
    }

    const review = await prisma.review.findUnique({ where: { id } });
    if (!review) {
      throw { status: 404, message: 'Review not found' };
    }
    if (review.isDeleted && !(userCtx && (userCtx.id === review.userId || userCtx.role === 'ADMIN' || userCtx.role === 'MODERATOR'))) {
      throw { status: 404, message: 'Review not found' };
    }
    return review;
  } catch (error) {
    console.error('Error fetching review:', error);
    throw error.status ? error : new Error(`Failed to fetch review: ${error.message}`);
  }
};

/**
 * Lists reviews with filters and pagination.
 * @param {Object} filters - Filter criteria
 * @param {Object} pagination - Pagination options
 * @returns {Promise<Object>} Reviews and pagination info
 * @throws {Error} If input is invalid or query fails
 */
const listReviews = async (filters, pagination) => {
  try {
    // Validate inputs
    if (filters && typeof filters !== 'object') {
      throw { status: 400, message: 'Invalid filters' };
    }
    if (pagination && typeof pagination !== 'object') {
      throw { status: 400, message: 'Invalid pagination' };
    }

    // Check database connection
    if (!prisma) {
      throw { status: 500, message: 'Database connection not available' };
    }

    const where = {};
    if (filters.type && Object.values(REVIEW_TYPE).includes(filters.type)) {
      where.type = filters.type;
    }
    if (filters.productId) {
      const productIdNum = Number(filters.productId);
      if (isNaN(productIdNum) || productIdNum <= 0 || !Number.isInteger(productIdNum)) {
        throw { status: 400, message: 'Invalid productId filter' };
      }
      where.productId = productIdNum;
    }
    if (filters.orderId) {
      const orderIdNum = Number(filters.orderId);
      if (isNaN(orderIdNum) || orderIdNum <= 0 || !Number.isInteger(orderIdNum)) {
        throw { status: 400, message: 'Invalid orderId filter' };
      }
      where.orderId = orderIdNum;
    }
    if (filters.userId) {
      if (typeof filters.userId !== 'string') {
        throw { status: 400, message: 'Invalid userId filter: must be a string' };
      }
      where.userId = filters.userId; // Use string userId
    }
    if (filters.rating) {
      const ratingNum = Number(filters.rating);
      if (isNaN(ratingNum) || !Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
        throw { status: 400, message: 'Invalid rating filter: must be an integer between 1 and 5' };
      }
      where.rating = ratingNum;
    }
    if (filters.minRating) {
      const minRatingNum = Number(filters.minRating);
      if (isNaN(minRatingNum) || !Number.isInteger(minRatingNum) || minRatingNum < 1 || minRatingNum > 5) {
        throw { status: 400, message: 'Invalid minRating filter: must be an integer between 1 and 5' };
      }
      where.rating = { gte: minRatingNum };
    }
    if (filters.maxRating) {
      const maxRatingNum = Number(filters.maxRating);
      if (isNaN(maxRatingNum) || !Number.isInteger(maxRatingNum) || maxRatingNum < 1 || maxRatingNum > 5) {
        throw { status: 400, message: 'Invalid maxRating filter: must be an integer between 1 and 5' };
      }
      where.rating = { ...(where.rating || {}), lte: maxRatingNum };
    }
    if (filters.hasImages !== undefined) {
      where.images = filters.hasImages ? { not: [] } : { equals: [] };
    }
    if (filters.fromDate || filters.toDate) {
      where.createdAt = {};
      if (filters.fromDate) {
        const fromDate = new Date(filters.fromDate);
        if (isNaN(fromDate.getTime())) {
          throw { status: 400, message: 'Invalid fromDate filter' };
        }
        where.createdAt.gte = fromDate;
      }
      if (filters.toDate) {
        const toDate = new Date(filters.toDate);
        if (isNaN(toDate.getTime())) {
          throw { status: 400, message: 'Invalid toDate filter' };
        }
        where.createdAt.lte = toDate;
      }
    }
    if (!filters.includeDeleted) {
      where.isDeleted = false;
    }

    const page = Number(pagination?.page) || 1;
    const pageSize = Number(pagination?.pageSize) || 20;
    if (isNaN(page) || page <= 0 || !Number.isInteger(page)) {
      throw { status: 400, message: 'Invalid page number' };
    }
    if (isNaN(pageSize) || pageSize <= 0 || !Number.isInteger(pageSize)) {
      throw { status: 400, message: 'Invalid page size' };
    }
    const skip = (page - 1) * pageSize;

    const order = {};
    if (pagination?.sort) {
      const [field, dir] = pagination.sort.split('_');
      if (!['createdAt', 'rating'].includes(field) || !['asc', 'desc'].includes(dir)) {
        throw { status: 400, message: 'Invalid sort format' };
      }
      order[field] = dir;
    } else {
      order.createdAt = 'desc';
    }

    const [items, total] = await Promise.all([
      prisma.review.findMany({ where, skip, take: pageSize, orderBy: order }),
      prisma.review.count({ where }),
    ]);

    return {
      items,
      pageInfo: {
        page,
        pageSize,
        total,
        hasNextPage: page * pageSize < total,
      },
    };
  } catch (error) {
    console.error('Error listing reviews:', error);
    throw error.status ? error : new Error(`Failed to list reviews: ${error.message}`);
  }
};

/**
 * Lists reviews with aggregated stats for admin dashboard.
 * @param {Object} filters - Filter criteria (status, type, etc.)
 * @param {Object} pagination - Pagination options
 * @returns {Promise<Object>} Reviews, stats, and pagination info
 */
const listReviewsWithStats = async (filters, pagination) => {
  try {
    const where = { isDeleted: false };

    if (filters.type && filters.type !== 'all') {
      where.type = filters.type === 'product' ? REVIEW_TYPE.PRODUCT : REVIEW_TYPE.DELIVERY;
    }
    if (filters.status && filters.status !== 'all') {
      where.status = filters.status.toUpperCase();
    }
    if (filters.productId) {
      where.productId = Number(filters.productId);
    }
    if (filters.orderId) {
      where.orderId = Number(filters.orderId);
    }
    if (filters.userId) {
      where.userId = filters.userId;
    }

    const page = Number(pagination.page) || 1;
    const pageSize = Number(pagination.pageSize) || 50;
    const skip = (page - 1) * pageSize;

    let orderBy = { createdAt: 'desc' };
    if (pagination.sort) {
      const [field, dir] = pagination.sort.split('_');
      if (['createdAt', 'rating', 'status'].includes(field) && ['asc', 'desc'].includes(dir)) {
        orderBy = { [field]: dir };
      }
    }

    const [items, total] = await Promise.all([
      prisma.review.findMany({ 
        where, 
        skip, 
        take: pageSize, 
        orderBy,
        include: {
          user: { select: { id: true, name: true, email: true } },
          product: { select: { id: true, name: true } },
          order: { 
            select: { 
              id: true, 
              status: true, 
              updatedAt: true 
            } 
          }
        }
      }),
      prisma.review.count({ where })
    ]);

    const stats = await computeReviewStats();

    const enrichedItems = items.map(review => ({
      ...review,
      id: review.id,
      userId: review.userId,
      type: review.type,
      productId: review.productId,
      orderId: review.orderId,
      rating: review.rating,
      title: review.title,
      comment: review.comment,
      images: review.images,
      isEdited: review.isEdited,
      isDeleted: review.isDeleted,
      createdAt: review.createdAt.toISOString(),
      updatedAt: review.updatedAt.toISOString(),
      status: review.status ? review.status.toLowerCase() : 'approved',
      customerName: review.user?.name || `User #${review.userId}`,
      customerEmail: review.user?.email || null,
      productName: review.product?.name || null,
      isVerifiedPurchase: !!review.order && review.order.status === 'DELIVERED',
      helpfulVotes: 0,
      notHelpfulVotes: 0,
      adminResponse: review.adminResponse || null,
      deliveryDate: review.type === REVIEW_TYPE.DELIVERY && review.order ? review.order.updatedAt.toISOString() : null,
      courierName: null,
      courierRating: null
    }));

    return {
      items: enrichedItems,
      stats,
      pageInfo: {
        page,
        pageSize,
        total,
        hasNextPage: page * pageSize < total,
      },
    };
  } catch (error) {
    console.error('Error in listReviewsWithStats:', error);
    throw error.status ? error : { status: 500, message: `Failed to list reviews: ${error.message}` };
  }
};

/**
 * Computes global review statistics.
 * @returns {Promise<Object>} Stats object
 */
const computeReviewStats = async () => {
  const baseWhere = { isDeleted: false };
  const [totalRes, productRes, deliveryRes, pendingRes, approvedRes, rejectedRes, avgRes] = await Promise.all([
    prisma.review.count({ where: baseWhere }),
    prisma.review.count({ where: { ...baseWhere, type: REVIEW_TYPE.PRODUCT } }),
    prisma.review.count({ where: { ...baseWhere, type: REVIEW_TYPE.DELIVERY } }),
    prisma.review.count({ where: { ...baseWhere, status: 'PENDING' } }),
    prisma.review.count({ where: { ...baseWhere, status: 'APPROVED' } }),
    prisma.review.count({ where: { ...baseWhere, status: 'REJECTED' } }),
    prisma.review.aggregate({
      where: baseWhere,
      _avg: { rating: true }
    })
  ]);

  return {
    total: totalRes,
    product: productRes,
    delivery: deliveryRes,
    pending: pendingRes,
    approved: approvedRes,
    rejected: rejectedRes,
    averageRating: avgRes._avg.rating || 0
  };
};

/**
 * Updates review status (approve/reject).
 * @param {string} id - Review ID
 * @param {string} status - New status ('approved' | 'rejected')
 * @param {Object} userCtx - Admin user context
 * @returns {Promise<Object>} Updated review
 */
const updateReviewStatus = async (id, status, userCtx) => {
  const statusMap = { approved: 'APPROVED', rejected: 'REJECTED' };
  if (!statusMap[status]) {
    throw { status: 400, message: 'Invalid status' };
  }
  if (!userCtx || !['ADMIN', 'MODERATOR'].includes(userCtx.role)) {
    throw { status: 403, message: 'Forbidden' };
  }

  return await prisma.$transaction(async (tx) => {
    const review = await tx.review.findUnique({ where: { id } });
    if (!review || review.isDeleted) {
      throw { status: 404, message: 'Review not found' };
    }

    const updated = await tx.review.update({
      where: { id },
      data: { status: statusMap[status] }
    });

    if (review.type === REVIEW_TYPE.PRODUCT && review.productId) {
      await recalcProductAggregates(review.productId, tx);
    }

    return {
      ...updated,
      status: status // Return lowercase for frontend
    };
  });
};

/**
 * Updates or adds admin response to a review.
 * @param {string} id - Review ID
 * @param {string} adminResponse - Response text
 * @param {Object} userCtx - Admin user context
 * @returns {Promise<Object>} Updated review
 */
const updateAdminResponse = async (id, adminResponse, userCtx) => {
  if (typeof adminResponse !== 'string' || !adminResponse.trim()) {
    throw { status: 400, message: 'Invalid admin response' };
  }
  if (!userCtx || !['ADMIN', 'MODERATOR'].includes(userCtx.role)) {
    throw { status: 403, message: 'Forbidden' };
  }

  const updated = await prisma.review.update({
    where: { id },
    data: { 
      adminResponse: adminResponse.trim(),
      updatedAt: new Date()
    }
  });

  return {
    ...updated,
    adminResponse: updated.adminResponse
  };
};

/**
 * Gets rating summary for a product (only APPROVED reviews).
 * @param {number} productId - The ID of the product
 * @returns {Promise<Object>} Rating summary with average, count, and distribution
 * @throws {Error} If productId is invalid or query fails
 */
const getProductSummary = async (productId) => {
  try {
    // Validate productId
    const productIdNum = Number(productId);
    if (isNaN(productIdNum) || productIdNum <= 0 || !Number.isInteger(productIdNum)) {
      throw new Error('Invalid product ID');
    }

    // Check database connection
    if (!prisma) {
      throw new Error('Database connection not available');
    }

    const agg = await prisma.review.aggregate({
      where: { productId: productIdNum, type: REVIEW_TYPE.PRODUCT, isDeleted: false, status: 'APPROVED' },
      _avg: { rating: true },
      _count: { rating: true },
      _sum: { rating: true },
    });

    const distributionRaw = await prisma.$queryRaw`
      SELECT rating, COUNT(*) as count
      FROM "Review"
      WHERE "productId" = ${productIdNum} AND type = 'PRODUCT' AND "isDeleted" = false AND status = 'APPROVED'
      GROUP BY rating
    `;
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const row of distributionRaw) {
      distribution[row.rating] = Number(row.count);
    }

    return {
      averageRating: agg._avg.rating || 0,
      reviewsCount: agg._count.rating || 0,
      distribution,
    };
  } catch (error) {
    console.error('Error fetching product summary:', error);
    throw new Error(`Failed to fetch product summary: ${error.message}`);
  }
};

export {
  recalcProductAggregates,
  createReview,
  updateReview,
  deleteReview,
  getReviewById,
  listReviews,
  getProductSummary,
  listReviewsWithStats,
  updateReviewStatus,
  updateAdminResponse,
  computeReviewStats
};