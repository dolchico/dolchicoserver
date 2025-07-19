import express from 'express';
import {
  loginUser,
  registerUser,
  verifyEmail,
  requestPhoneLoginOTP,
  verifyPhoneLoginOTP,
  resendPhoneLoginOTP,
  resendVerificationEmail
  // Add more controllers as needed (e.g., verifyPhone, resendVerification)
} from '../controllers/userController.js';
import { validateRegister, validateLogin } from '../validators/userValidator.js';
import { updateUserProfile } from '../controllers/userController.js';
import {ensureAuth} from "../middleware/authMiddleware.js"
// ⬅ authLimiter and otpRateLimiter deliberately NOT imported

const router = express.Router();

/* ───────── Authentication ───────── */
router.post('/login',                 validateLogin,    loginUser);
router.post('/register',              validateRegister, registerUser);

/* ───────── Email verification ───── */
router.get ('/verify-email', verifyEmail);

/* ───────── Phone-OTP login ──────── */
router.post('/login/request-otp', requestPhoneLoginOTP);
router.post('/login/resend-otp',  resendPhoneLoginOTP);
router.post('/login/verify-otp',  verifyPhoneLoginOTP);
router.post('/resend-verification', resendVerificationEmail);
router.patch('/update-profile', ensureAuth, updateUserProfile);


export default router;
