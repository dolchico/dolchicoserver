import express from 'express';
import { forgotPassword, resetPassword } from '../controllers/authController.js';

const router = express.Router();

// Maps the route to the 'forgotPassword' controller function
router.post('/forgot-password', forgotPassword);

// Maps the route to the 'resetPassword' controller function
router.post('/reset-password', resetPassword);

export default router;
