// Updated validators/review.validation.js - Accept CUID for IDs
import Joi from 'joi';

// CUID pattern (25 chars: lowercase letters, digits, underscore)
const cuidPattern = /^[c][0-9a-z]{24}$/i;

// User/public validators
export const createValidators = {
  body: Joi.object({
    type: Joi.string().valid('PRODUCT', 'DELIVERY').required(),
    productId: Joi.number().integer().positive().when('type', { is: 'PRODUCT', then: Joi.required() }),
    orderId: Joi.number().integer().positive().when('type', { is: 'DELIVERY', then: Joi.required() }),
    rating: Joi.number().integer().min(1).max(5).required(),
    title: Joi.string().max(100).optional(),
    comment: Joi.string().max(2000).optional(),
    images: Joi.array().items(Joi.string()).max(5).optional(),
    metadata: Joi.object().optional()
  })
};

export const updateValidators = {
  params: Joi.object({
    id: Joi.string().pattern(cuidPattern).required()
  }),
  body: Joi.object({
    rating: Joi.number().integer().min(1).max(5).optional(),
    title: Joi.string().max(100).optional(),
    comment: Joi.string().max(2000).optional(),
    images: Joi.array().items(Joi.string()).max(5).optional()
  }).min(1)
};

export const listValidators = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    pageSize: Joi.number().integer().min(1).max(50).default(20),
    sort: Joi.string().pattern(/^(createdAt|rating)_(asc|desc)$/).default('createdAt_desc'),
    type: Joi.string().valid('PRODUCT', 'DELIVERY'),
    productId: Joi.number().integer().positive(),
    orderId: Joi.number().integer().positive(),
    userId: Joi.string().uuid(),
    rating: Joi.number().integer().min(1).max(5),
    minRating: Joi.number().integer().min(1).max(5),
    maxRating: Joi.number().integer().min(1).max(5),
    hasImages: Joi.boolean(),
    fromDate: Joi.date(),
    toDate: Joi.date(),
    includeDeleted: Joi.boolean()
  })
};

// Admin validators
export const adminListValidators = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    pageSize: Joi.number().integer().min(1).max(100).default(50),
    sort: Joi.string().pattern(/^(createdAt|rating|status)_(asc|desc)$/).default('createdAt_desc'),
    type: Joi.string().valid('all', 'product', 'delivery'),
    status: Joi.string().valid('all', 'pending', 'approved', 'rejected'),
    productId: Joi.number().integer().positive(),
    orderId: Joi.number().integer().positive(),
    userId: Joi.string().uuid()
  })
};

export const adminUpdateValidators = {
  params: Joi.object({
    id: Joi.string().pattern(cuidPattern).required()
  }),
  body: Joi.object({
    status: Joi.string().valid('approved', 'rejected'),
    adminResponse: Joi.string().min(1).max(1000)
  }).or('status', 'adminResponse')
};

// Fixed validate HOF - Validates specific parts (body, params, query)
export const validate = (validators) => {
  return (req, res, next) => {
    let validationError = null;

    // Validate body if present
    if (validators.body) {
      const { error } = validators.body.validate(req.body, { abortEarly: false });
      if (error) validationError = error;
    }

    // Validate params if present
    if (validators.params && !validationError) {
      const { error } = validators.params.validate(req.params, { abortEarly: false });
      if (error) validationError = error;
    }

    // Validate query if present
    if (validators.query && !validationError) {
      const { error } = validators.query.validate(req.query, { abortEarly: false });
      if (error) validationError = error;
    }

    if (validationError) {
      const messages = validationError.details.map(d => d.message);
      return res.status(400).json({ 
        success: false, 
        message: 'Validation error', 
        errors: messages 
      });
    }

    next();
  };
};