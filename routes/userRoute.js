// userRoutes.js - Refactored to use separate wishlist routes
import express from 'express';
import {
  loginUser,
  registerUser,
  verifyEmail,
  verifyEmailOtp,
  verifyPhoneOtp,
  completeProfile,
  checkUserExistence,
  updateUserProfile,
  resendVerificationEmail,
  sendUnifiedOTP,
  checkUserForAuth,
  sendEmailOTPToExisting,
  sendPhoneOTPToExisting,
  requestEmailChange,
  verifyEmailChange,
  getUserProfile 
} from '../controllers/userController.js';

import { verifyEmailByLink } from '../controllers/emailVerificationController.js';

import { registerWithEmail , verifyEmailToken} from '../controllers/authController.js';


import { requestAccountDeletion, verifyAccountDeletion } from '../controllers/userController.js';
import { 
  forgotPassword, 
  resetPassword
} from '../controllers/authController.js';
import { 
  ensureAuth,
  ensureProfileComplete,
  ensureAuthWithStatus
} from "../middleware/authMiddleware.js";

// Import wishlist routes
import wishlistRoutes from './wishlistRoutes.js';

const router = express.Router();

// ================================
// WISHLIST ROUTES - Use separate router
// ================================
router.use('/wishlist', wishlistRoutes);

// ================================
// PRIMARY AUTHENTICATION FLOW
// ================================

// Register user (sends OTP to email or phone)
router.post('/register', registerUser);

// Send OTP (alias for register for frontend compatibility)
router.post('/send-otp', registerUser);

// Verify Email OTP
router.post('/verify-email-otp', verifyEmailOtp);

// Verify Phone OTP
router.post('/verify-phone-otp', verifyPhoneOtp);

// Unified OTP verification endpoint
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, phoneNumber, otp } = req.body;
    
    if (!otp) {
      return res.status(400).json({
        success: false,
        message: 'OTP is required'
      });
    }
    
    if (email) {
      await verifyEmailOtp(req, res);
    } else if (phoneNumber) {
      await verifyPhoneOtp(req, res);
    } else {
      return res.status(400).json({
        success: false,
        message: 'Email or phone number is required for OTP verification'
      });
    }
  } catch (error) {
    console.error('Unified OTP verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify OTP'
    });
  }
});

// Complete profile for new users - After OTP verification
router.post('/complete-profile', completeProfile);

// ================================
// TRADITIONAL AUTHENTICATION
// ================================  

// Login with email/phone and password
router.post('/login', loginUser);

// ================================
// PASSWORD RESET
// ================================

router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// ================================
// EMAIL VERIFICATION
// ================================

// Verify email via link (token-based)
router.get('/verify-email', verifyEmail);

// Resend email verification
router.post('/resend-verification', resendVerificationEmail);

// ================================
// PROFILE MANAGEMENT
// ================================

// Update profile - Enhanced auth with profile completion check
router.patch('/update-profile', 
  ensureAuthWithStatus,    // ← First: authenticates and sets req.userStatus
  ensureProfileComplete,   // ← Second: checks if profile is complete
  updateUserProfile        // ← Third: handles the actual update
);

router.get('/profile', getUserProfile);

router.get('/get-user', ensureAuth, getUserProfile);

// ================================
// UTILITY ROUTES
// ================================

// Check authentication status
router.get('/auth/status', 
  ensureAuth,
  async (req, res) => {
    try {
      const { getUserAuthStatus } = await import('../services/userService.js');
      const userStatus = await getUserAuthStatus(req.user.userId);
      
      res.json({
        success: true,
        isAuthenticated: true,
        user: userStatus,
        requiresProfileCompletion: !userStatus?.isProfileComplete
      });
    } catch (error) {
      console.error('Auth status error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get authentication status'
      });
    }
  }
);

// Resend OTP - unified endpoint
router.post('/auth/resend-otp', 
  async (req, res) => {
    try {
      const { email, phoneNumber } = req.body;
      
      if (!email && !phoneNumber) {
        return res.status(400).json({
          success: false,
          message: 'Email or phone number is required'
        });
      }

      req.body.isResend = true;
      await registerUser(req, res);
    } catch (error) {
      console.error('Resend OTP error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to resend OTP'
      });
    }
  }
);

// New unified routes
router.post('/auth/send-otp', sendUnifiedOTP);
router.post('/auth/check-user', checkUserForAuth);

// Existing user OTP routes
router.post('/send-email-otp', sendEmailOTPToExisting);
router.post('/send-phone-otp', sendPhoneOTPToExisting);

// Check user existence (legacy)
router.post('/check-user', checkUserExistence);

// ================================
// LEGACY ENDPOINTS (Backward compatibility)
// ================================
// // Legacy phone OTP endpoints
router.post('/login/request-otp', 
  async (req, res) => {
    try {
      await registerUser(req, res);
    } catch (error) {
      console.error('Legacy request OTP error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to send OTP'
      });
    }
  }
);

router.post('/login/verify-otp', 
  async (req, res) => {
    try {
      await verifyPhoneOtp(req, res);
    } catch (error) {
      console.error('Legacy verify OTP error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to verify OTP'
      });
    }
  }
);

router.post('/login/resend-otp', 
  async (req, res) => {
    try {
      req.body.isResend = true;
      await registerUser(req, res);
    } catch (error) {
      console.error('Legacy resend OTP error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to resend OTP'
      });
    }
  }
);

// routes/user.js
router.post('/request-email-change', ensureAuth, requestEmailChange);
router.post('/verify-email-change',  ensureAuth, verifyEmailChange);



router.post('/request-account-deletion', ensureAuth, requestAccountDeletion);
router.post('/verify-account-deletion', ensureAuth, verifyAccountDeletion);


// Start email registration flow (if distinct from your existing registerUser)
router.post('/register-email', registerWithEmail);

// Public link verification endpoint (button click)
router.get('/verify-email', verifyEmailByLink);

// Token-based email verification (for frontend POST requests)
router.post('/verify-email', verifyEmailToken);

// Resend email verification
router.post('/resend-verification', resendVerificationEmail);
// Add this route to your auth routes
router.post('/verify-email-token', verifyEmailToken);



export default router;
