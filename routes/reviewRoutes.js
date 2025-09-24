import express from 'express';
import controller from '../controllers/reviewController.js';
import upload from '../middleware/multer.js';
import { createValidators, updateValidators, listValidators, validate } from '../validators/review.validation.js';
import { ensureAuth, optionalAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

// Accept up to 2 image files named `images` on create/update
router.post('/', ensureAuth, upload.array('images', 2), createValidators, validate, controller.create);
router.patch('/:id', ensureAuth, upload.array('images', 2), updateValidators, validate, controller.update);
router.delete('/:id', ensureAuth, controller.remove);
router.get('/', optionalAuth, listValidators, validate, controller.list);
router.get('/:id', optionalAuth, controller.getById);
router.get('/products/:productId', optionalAuth, controller.productReviews);
router.get('/orders/:orderId', ensureAuth, controller.orderReview);

export default router;
