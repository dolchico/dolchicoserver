import { Router } from 'express';
import upload from '../middleware/multer.js';
import { uploadImage } from '../controllers/image.controller.js';
import { ensureAuthWithStatus, ensureRole } from '../middleware/authMiddleware.js';

const router = Router();

router.post('/upload', 
  ensureAuthWithStatus, 
  ensureRole(['ADMIN']), 
  upload.single('image'),
  uploadImage
);

export default router;