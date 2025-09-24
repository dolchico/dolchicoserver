import reviewService from '../services/reviewService.js';
import { createValidators, updateValidators, listValidators, validate } from '../validators/review.validation.js';
import { uploadBuffer } from '../services/cloudinary.service.js';

const create = async (req, res) => {
  try {
    const dto = { ...req.body };
    const userId = req.user.id;

    // If files were uploaded, stream them to Cloudinary and attach URLs
    if (req.files && req.files.length > 0) {
      const urls = [];
      for (const file of req.files.slice(0, 2)) {
        const url = await uploadBuffer(file.buffer, { folder: 'reviews' });
        urls.push(url);
      }
      dto.images = Array.isArray(dto.images) ? dto.images.concat(urls).slice(0,2) : urls;
    }

    const review = await reviewService.createReview(dto, userId);
    return res.status(201).json(review);
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({ success: false, message: err.message || 'Internal error' });
  }
};

const update = async (req, res) => {
  try {
    const id = req.params.id;
    const dto = { ...req.body };
    const userCtx = req.user;

    // Handle uploaded files similar to create
    if (req.files && req.files.length > 0) {
      const urls = [];
      for (const file of req.files.slice(0, 2)) {
        const url = await uploadBuffer(file.buffer, { folder: 'reviews' });
        urls.push(url);
      }
      dto.images = Array.isArray(dto.images) ? dto.images.concat(urls).slice(0,2) : urls;
    }

    const updated = await reviewService.updateReview(id, dto, userCtx);
    return res.json(updated);
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({ success: false, message: err.message || 'Internal error' });
  }
};

const remove = async (req, res) => {
  try {
    const id = req.params.id;
    const userCtx = req.user;
    const result = await reviewService.deleteReview(id, userCtx);
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
    const review = await reviewService.getReviewById(id, userCtx);
    return res.json(review);
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({ success: false, message: err.message || 'Internal error' });
  }
};

const list = async (req, res) => {
  try {
    const filters = req.query;
    if (!req.user || !['ADMIN','MODERATOR'].includes(req.user.role)) filters.includeDeleted = false;
    const pagination = { page: Number(req.query.page) || 1, pageSize: Number(req.query.pageSize) || 20, sort: req.query.sort };
    const result = await reviewService.listReviews(filters, pagination);
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
    const result = await reviewService.listReviews(filters, pagination);
    const summary = await reviewService.getProductSummary(productId);
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
    const review = await reviewService.listReviews({ type: 'DELIVERY', orderId, userId, includeDeleted: true }, { page:1, pageSize:1 });
    if (!review.items.length) return res.status(404).json({ success: false, message: 'Not found' });
    return res.json(review.items[0]);
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({ success: false, message: err.message || 'Internal error' });
  }
};

export default { create, update, remove, getById, list, productReviews, orderReview };
