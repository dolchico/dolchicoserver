import express from 'express';
import {
  loginUser,
  registerUser,
  verifyEmail,
  requestPhoneLoginOTP,
  verifyPhoneLoginOTP,
  resendPhoneLoginOTP
  // Add more controllers as needed (e.g., verifyPhone, resendVerification)
} from '../controllers/userController.js';
import { validateRegister, validateLogin } from '../validators/userValidator.js';
import { authLimiter, otpRateLimiter } from '../middleware/otpRateLimiter.js';

const router = express.Router();

// Email/password login
router.post('/login', validateLogin, loginUser);

// Registration
router.post('/register', authLimiter, validateRegister, registerUser);

// Email verification (supports both POST and GET)
router.post('/verify-email', verifyEmail);
router.get('/verify-email', verifyEmail);

// Phone OTP login routes
router.post('/login/request-otp', requestPhoneLoginOTP);
router.post('/login/resend-otp', resendPhoneLoginOTP);
router.post('/login/verify-otp', verifyPhoneLoginOTP);

// (Optional) Add more routes as needed
// router.post('/verify-phone', verifyPhone);
// router.post('/resend-verification', resendVerification);

export default router;
