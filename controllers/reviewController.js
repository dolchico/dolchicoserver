import { createReview, updateReview, deleteReview, getReviewById, listReviews, getProductSummary, listReviewsWithStats, updateReviewStatus, updateAdminResponse } from '../services/reviewService.js';

const create = async (req, res) => {
  try {
    let dto = req.body;
    const userId = req.user.id;

    // Handle uploaded images
    const imageUrls = [];
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        imageUrls.push(`/uploads/reviews/${file.filename}`);
      });
    }
    dto.images = imageUrls;

    const review = await createReview(dto, userId);
    return res.status(201).json({ success: true, data: review });
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({ success: false, message: err.message || 'Internal error' });
  }
};

const update = async (req, res) => {
  try {
    const id = req.params.id;
    let dto = req.body;
    const userCtx = req.user;

    // Handle uploaded images (replace existing)
    const imageUrls = [];
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        imageUrls.push(`/uploads/reviews/${file.filename}`);
      });
      dto.images = imageUrls;
    }

    const updated = await updateReview(id, dto, userCtx);
    return res.json({ success: true, data: updated });
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({ success: false, message: err.message || 'Internal error' });
  }
};

const remove = async (req, res) => {
  try {
    const id = req.params.id;
    const userCtx = req.user;
    const result = await deleteReview(id, userCtx);
    return res.json(result);
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({ success: false, message: err.message || 'Internal error' });
  }
};

const getById = async (req, res) => {
  try {
    const id = req.params.id;
    const userCtx = req.user || null;
    const review = await getReviewById(id, userCtx);
    return res.json(review);
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({ success: false, message: err.message || 'Internal error' });
  }
};

const list = async (req, res) => {
  try {
    const filters = req.query;
    if (!req.user || !['ADMIN', 'MODERATOR'].includes(req.user.role)) filters.includeDeleted = false;
    const pagination = { page: Number(req.query.page) || 1, pageSize: Number(req.query.pageSize) || 20, sort: req.query.sort };
    const result = await listReviews(filters, pagination);
    return res.json(result);
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({ success: false, message: err.message || 'Internal error' });
  }
};

const productReviews = async (req, res) => {
  try {
    const productId = Number(req.params.productId);
    const pagination = { page: Number(req.query.page) || 1, pageSize: Number(req.query.pageSize) || 20 };
    const filters = { type: 'PRODUCT', productId, includeDeleted: false };
    const result = await listReviews(filters, pagination);
    const summary = await getProductSummary(productId);
    return res.json({ items: result.items, pageInfo: result.pageInfo, meta: summary });
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({ success: false, message: err.message || 'Internal error' });
  }
};

const orderReview = async (req, res) => {
  try {
    const orderId = Number(req.params.orderId);
    const userId = req.user.id;
    const review = await listReviews({ type: 'DELIVERY', orderId, userId, includeDeleted: true }, { page: 1, pageSize: 1 });
    if (!review.items.length) return res.status(404).json({ success: false, message: 'Not found' });
    return res.json(review.items[0]);
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({ success: false, message: err.message || 'Internal error' });
  }
};

// Admin-specific methods
const adminList = async (req, res) => {
  try {
    const filters = req.query;
    const pagination = { 
      page: Number(req.query.page) || 1, 
      pageSize: Number(req.query.pageSize) || 50,
      sort: req.query.sort || 'createdAt_desc'
    };
    const result = await listReviewsWithStats(filters, pagination);
    return res.json({ 
      success: true, 
      reviews: result.items, 
      stats: result.stats,
      pageInfo: result.pageInfo 
    });
  } catch (err) {
    const status = err.status || 500;
    console.error('Error listing admin reviews:', err);
    return res.status(status).json({ success: false, message: err.message || 'Internal error' });
  }
};

const adminUpdate = async (req, res) => {
  try {
    const id = req.params.id;
    const { status, adminResponse } = req.body;
    const userCtx = req.user;

    let result;
    if (status !== undefined) {
      result = await updateReviewStatus(id, status, userCtx);
    } else if (adminResponse !== undefined) {
      result = await updateAdminResponse(id, adminResponse, userCtx);
    } else {
      throw { status: 400, message: 'No valid update field provided (status or adminResponse)' };
    }

    return res.json({ success: true, data: result });
  } catch (err) {
    const status = err.status || 500;
    console.error('Error updating admin review:', err);
    return res.status(status).json({ success: false, message: err.message || 'Internal error' });
  }
};

export default { create, update, remove, getById, list, productReviews, orderReview, adminList, adminUpdate };