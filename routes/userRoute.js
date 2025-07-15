// routes/userRoute.js
// ---------------------------------------------
// TEMPORARY: Rate-limit middleware removed for local testing
// ---------------------------------------------

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
// ⬅ authLimiter and otpRateLimiter deliberately NOT imported

const router = express.Router();

/* ───────── Authentication ───────── */
router.post('/login',                 validateLogin,    loginUser);
router.post('/register',              validateRegister, registerUser);

/* ───────── Email verification ───── */
router.post('/verify-email', verifyEmail);
router.get ('/verify-email', verifyEmail);

/* ───────── Phone-OTP login ──────── */
router.post('/login/request-otp', requestPhoneLoginOTP);
router.post('/login/resend-otp',  resendPhoneLoginOTP);
router.post('/login/verify-otp',  verifyPhoneLoginOTP);

router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

/* ───────── Export ───────────────── */
export default router;
