import express from 'express';
import controller from '../controllers/reviewController.js';
import { createValidators, updateValidators, listValidators, validate } from '../validators/review.validation.js';
import { ensureAuth, optionalAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', ensureAuth, createValidators, validate, controller.create);
router.patch('/:id', ensureAuth, updateValidators, validate, controller.update);
router.delete('/:id', ensureAuth, controller.remove);
router.get('/', optionalAuth, listValidators, validate, controller.list);
router.get('/:id', optionalAuth, controller.getById);
router.get('/products/:productId', optionalAuth, controller.productReviews);
router.get('/orders/:orderId', ensureAuth, controller.orderReview);

export default router;
