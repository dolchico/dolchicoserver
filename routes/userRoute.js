// routes/userRoute.js

import express from 'express';
import {
  loginUser,
  registerUser,
  verifyEmail,       // <-- Add this controller for email verification
  // Add more controllers as needed (e.g., verifyPhone, resendVerification, etc.)
} from '../controllers/userController.js';
import { validateRegister, validateLogin } from '../validators/userValidator.js';
import { authLimiter } from '../middleware/rateLimit.js';

const router = express.Router();

// User login
router.post('/login', validateLogin, loginUser);

// User registration with rate limiting and validation
router.post('/register', authLimiter, validateRegister, registerUser);

// Email verification endpoint (user clicks link in email)
router.post('/verify-email', verifyEmail);

// You can add more routes here, e.g.:
// router.post('/verify-phone', verifyPhone);
// router.post('/resend-verification', resendVerification);

export default router;
