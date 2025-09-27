import { body, param, query, validationResult } from 'express-validator';
import isURL from 'validator/lib/isURL.js';

const REVIEW_TYPE = { PRODUCT: 'PRODUCT', DELIVERY: 'DELIVERY' };
const MAX_IMAGES = 6;
const TITLE_MAX = 100;
const COMMENT_MAX = 2000;

const baseValidators = [
  body('type').exists().isIn([REVIEW_TYPE.PRODUCT, REVIEW_TYPE.DELIVERY]),
  body('rating').exists().isInt({ min: 1, max: 5 }).withMessage('rating must be 1..5'),
  body('title').optional().isString().isLength({ max: TITLE_MAX }),
  body('comment').optional().isString().isLength({ max: COMMENT_MAX }),
  body('images').optional().isArray({ max: MAX_IMAGES }).custom((arr) => {
    for (const url of arr) {
      if (!isURL(url, { require_protocol: true })) {
        throw new Error('Each image must be a valid absolute URL');
      }
    }
    return true;
  })
];

const createValidators = [
  ...baseValidators,
  body('productId').if(body('type').equals(REVIEW_TYPE.PRODUCT)).exists().isInt(),
  body('orderId').if(body('type').equals(REVIEW_TYPE.DELIVERY)).exists().isInt(),
  // deliveryAgentId removed
];

const updateValidators = [
  param('id').exists().isString(),
  body('rating').optional().isInt({ min: 1, max: 5 }),
  body('title').optional().isString().isLength({ max: TITLE_MAX }),
  body('comment').optional().isString().isLength({ max: COMMENT_MAX }),
  body('images').optional().isArray({ max: MAX_IMAGES }).custom((arr) => {
    for (const url of arr) {
      if (!isURL(url, { require_protocol: true })) throw new Error('Each image must be a valid absolute URL');
    }
    return true;
  })
];

const listValidators = [
  query('type').optional().isIn([REVIEW_TYPE.PRODUCT, REVIEW_TYPE.DELIVERY]),
  query('productId').optional().isInt(),
  query('orderId').optional().isInt(),
  // deliveryAgentId query removed
  query('userId').optional().isInt(),
  query('rating').optional().isInt({ min: 1, max: 5 }),
  query('minRating').optional().isInt({ min: 1, max: 5 }),
  query('maxRating').optional().isInt({ min: 1, max: 5 }),
  query('hasImages').optional().isBoolean(),
  query('fromDate').optional().isISO8601(),
  query('toDate').optional().isISO8601(),
  query('page').optional().isInt({ min: 1 }),
  query('pageSize').optional().isInt({ min: 1, max: 100 }),
  query('sort').optional().isIn(['createdAt_desc', 'createdAt_asc', 'rating_desc', 'rating_asc'])
];

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
  next();
};

export { createValidators, updateValidators, listValidators, validate };
