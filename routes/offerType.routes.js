import { Router } from 'express';
import * as OfferTypeController from '../controllers/offerType.controller.js';
import upload from '../middleware/multer.js';
import { ensureAuthWithStatus, ensureRole } from '../middleware/authMiddleware.js';

const router = Router();

// Admin routes
router.post('/offer-types', ensureAuthWithStatus, ensureRole(['ADMIN']), upload.single('icon'), OfferTypeController.createOfferType);
router.put('/offer-types/:id', ensureAuthWithStatus, ensureRole(['ADMIN']), upload.single('icon'), OfferTypeController.updateOfferType);
router.delete('/offer-types/:id', ensureAuthWithStatus, ensureRole(['ADMIN']), OfferTypeController.deleteOfferType);

// Public routes
router.get('/offer-types', OfferTypeController.listOfferTypes);
router.get('/offer-types/:id', OfferTypeController.getOfferType);

export default router;
