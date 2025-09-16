import { body, validationResult } from 'express-validator';
import ticketService from '../services/ticket.service.js';
import prisma from '../lib/prisma.js';
import jwt from 'jsonwebtoken';

const validate = [
  body('fullName')
    .exists().withMessage('fullName is required')
    .isString().withMessage('fullName must be a string')
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('fullName must be between 2 and 100 characters'),

  body('email')
    .exists().withMessage('email is required')
    .isEmail().withMessage('email must be a valid email')
    .normalizeEmail({ all_lowercase: true }),

  body('subject')
    .exists().withMessage('subject is required')
    .isString().withMessage('subject must be a string')
    .trim()
    .isLength({ min: 3, max: 200 }).withMessage('subject must be between 3 and 200 characters'),

  body('message')
    .exists().withMessage('message is required')
    .isString().withMessage('message must be a string')
    .trim()
    .isLength({ min: 10, max: 2000 }).withMessage('message must be between 10 and 2000 characters'),

  body('userId')
    .optional()
    .isInt({ gt: 0 }).withMessage('userId must be a positive integer'),

  body('orderId')
    .optional()
    .isInt({ gt: 0 }).withMessage('orderId must be a positive integer'),

  body('products')
    .optional()
    .isArray({ min: 1, max: 50 }).withMessage('products must be an array with 1 to 50 items'),

  body('products.*.productId')
    .if(body('products').exists())
    .exists().withMessage('productId is required')
    .isInt({ gt: 0 }).withMessage('productId must be a positive integer'),

  body('products.*.productName')
    .if(body('products').exists())
    .exists().withMessage('productName is required')
    .isString().withMessage('productName must be a string')
    .trim()
    .isLength({ min: 1, max: 200 }).withMessage('productName must be between 1 and 200 characters'),

  body('products.*.action')
    .if(body('products').exists())
    .exists().withMessage('action is required')
    .isIn(['Refund', 'Replacement']).withMessage('action must be one of Refund or Replacement')
];

function mapValidationErrors(errorsArray) {
  return errorsArray.map(err => ({ field: err.param, message: err.msg }));
}

async function parseOptionalToken(req) {
  const auth = req.headers.authorization || req.headers.Authorization;
  if (!auth || !auth.startsWith('Bearer ')) return null;
  const token = auth.slice(7).trim();
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'shhhhh');
    return decoded;
  } catch (err) {
    const e = new Error('Invalid or expired authentication token');
    e.code = 'INVALID_TOKEN';
    throw e;
  }
}

export const createTicketHandler = [
  ...validate,
  async (req, res) => {
    // Reject unknown fields by whitelisting expected keys
    const allowed = new Set(['fullName','email','subject','message','userId','orderId','products']);
    for (const k of Object.keys(req.body)) {
      if (!allowed.has(k)) {
        return res.status(400).json({ success: false, message: 'Validation failed', errors: [{ field: k, message: 'Unknown field' }] });
      }
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: mapValidationErrors(errors.array()) });
    }

    // Parse optional token
    let tokenPayload = null;
    try {
      tokenPayload = await parseOptionalToken(req);
    } catch (err) {
      return res.status(401).json({ success: false, message: 'Invalid or expired authentication token', error: 'INVALID_TOKEN' });
    }

    const bodyUserId = req.body.userId;
    if (tokenPayload && typeof tokenPayload.sub !== 'undefined') {
      const tokenUserId = Number(tokenPayload.sub);
      if (bodyUserId && tokenUserId !== Number(bodyUserId)) {
        return res.status(401).json({ success: false, message: 'Invalid or expired authentication token', error: 'INVALID_TOKEN' });
      }
      // set userId if not provided
      if (!bodyUserId) req.body.userId = tokenUserId;
    }

    // Build sanitized input
    const input = {
      fullName: req.body.fullName.trim(),
      email: req.body.email.toLowerCase(),
      subject: req.body.subject.trim(),
      message: req.body.message.trim(),
      userId: req.body.userId ? Number(req.body.userId) : undefined,
      orderId: req.body.orderId ? Number(req.body.orderId) : undefined,
      products: Array.isArray(req.body.products) ? req.body.products.map(p => ({ productId: Number(p.productId), productName: p.productName.trim(), action: p.action })) : undefined
    };

    try {
      const ticket = await ticketService.createTicket(input);

      return res.status(200).json({
        success: true,
        message: 'Support ticket created successfully',
        data: {
          ticketId: ticket.ticketId,
          status: ticket.status,
          priority: ticket.priority,
          createdAt: ticket.createdAt.toISOString(),
          estimatedResponse: ticket.estimatedResponse,
          category: ticket.category
        }
      });
    } catch (err) {
      // If token parse error was thrown earlier we already returned; here handle prisma unique or internal
      if (err.code === 'INVALID_TOKEN') {
        return res.status(401).json({ success: false, message: 'Invalid or expired authentication token', error: 'INVALID_TOKEN' });
      }

      // Surface rate-limit shaped response if upstream middleware set a flag
      if (res.locals && res.locals.rateLimited) {
        return res.status(429).json({ success: false, message: 'Too many ticket creation requests. Please try again later.', error: 'RATE_LIMITED', retryAfter: 300 });
      }

      console.error(err);
      return res.status(500).json({ success: false, message: 'Internal server error occurred while creating ticket', error: 'INTERNAL_ERROR' });
    }
  }
];

export default { createTicketHandler };
