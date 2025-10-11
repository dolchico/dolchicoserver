// Updated reviewRoutes.js - Reordered routes to fix matching issue
import express from 'express';
import multer from 'multer';
import fs from 'fs';
import controller from '../controllers/reviewController.js';
import { createValidators, updateValidators, listValidators, adminListValidators, adminUpdateValidators, validate } from '../validators/review.validation.js';
import { ensureAuth, optionalAuth, ensureRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// Ensure uploads directory exists
const uploadsDir = 'public/uploads/reviews';
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + '-' + file.originalname);
  }
});
const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (['image/jpeg', 'image/jpg', 'image/png', 'image/svg+xml', 'application/zip'].includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'), false);
    }
  }
});

// Specific user/public routes first
router.post('/', ensureAuth, upload.array('images', 5), validate(createValidators), controller.create);
router.get('/', optionalAuth, validate(listValidators), controller.list);
router.get('/products/:productId', optionalAuth, controller.productReviews);
router.get('/orders/:orderId', ensureAuth, controller.orderReview);

// Admin routes (before generic /:id to avoid matching)
router.get('/admin', ensureAuth, ensureRole(['ADMIN', 'MODERATOR']), validate(adminListValidators), controller.adminList);
router.patch('/admin/:id', ensureAuth, ensureRole(['ADMIN', 'MODERATOR']), validate(adminUpdateValidators), controller.adminUpdate);

// Generic routes last
router.patch('/:id', ensureAuth, upload.array('images', 5), validate(updateValidators), controller.update);
router.delete('/:id', ensureAuth, controller.remove);
router.get('/:id', optionalAuth, controller.getById);

export default router;