// userRoutes.js - Updated to match userController
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
  resendVerificationEmail
} from '../controllers/userController.js';
import { 
  forgotPassword, 
  resetPassword
} from '../controllers/authController.js';
import { 
  ensureAuth,
  ensureAuthWithStatus,
  ensureProfileComplete
} from "../middleware/authMiddleware.js";

const router = express.Router();

// ================================
// PRIMARY AUTHENTICATION FLOW
// ================================

// Register user (sends OTP to email or phone)
router.post('/register', 
  registerUser
);

// Send OTP (alias for register for frontend compatibility)
router.post('/send-otp', 
  registerUser
);

// Verify Email OTP
router.post('/verify-email-otp', 
  verifyEmailOtp
);

// Verify Phone OTP
router.post('/verify-phone-otp', 
  verifyPhoneOtp
);

// Unified OTP verification endpoint (for frontend compatibility)
router.post('/verify-otp', 
  async (req, res) => {
    try {
      const { email, phoneNumber, otp } = req.body;
      
      if (email) {
        // Route to email OTP verification
        await verifyEmailOtp(req, res);
      } else if (phoneNumber) {
        // Route to phone OTP verification
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
  }
);

// Complete profile for new users - After OTP verification
router.post('/complete-profile', 
  completeProfile
);

// ================================
// TRADITIONAL AUTHENTICATION
// ================================  

// Login with email/phone and password
router.post('/login', 
  loginUser
);

// ================================
// PASSWORD RESET
// ================================

router.post('/forgot-password', 
  forgotPassword
);

router.post('/reset-password', 
  resetPassword
);

// ================================
// EMAIL VERIFICATION
// ================================

// Verify email via link (token-based)
router.get('/verify-email', 
  verifyEmail
);

// Resend email verification
router.post('/resend-verification', 
  resendVerificationEmail
);

// ================================
// PROFILE MANAGEMENT - Enhanced security
// ================================

// Update profile - Enhanced auth with profile completion check
router.patch('/update-profile', 
  ensureAuthWithStatus,
  ensureProfileComplete, // Only allow profile updates if initial profile is complete
  updateUserProfile
);

// Get user profile - Enhanced auth
router.get('/profile', 
  ensureAuthWithStatus,
  async (req, res) => {
    try {
      res.json({
        success: true,
        user: req.userStatus, // Contains complete user status
        message: 'Profile retrieved successfully'
      });
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve profile'
      });
    }
  }
);

// ================================
// UTILITY ROUTES
// ================================

// Check authentication status - useful for frontend
router.get('/auth/status', 
  ensureAuth,
  async (req, res) => {
    try {
      const { getUserAuthStatus } = await import('../services/userService.js');
      const userStatus = await getUserAuthStatus(req.user.id);
      
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

      // Mark as resend and route to registration (which handles existing users)
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

// ================================
// LEGACY ENDPOINTS (For backward compatibility)
// ================================

// Legacy phone OTP endpoints (if you need them)
router.post('/login/request-otp', 
  async (req, res) => {
    try {
      // Route to register for phone OTP
      await registerUser(req, res);
    } catch (error) {
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
      // Route to phone OTP verification
      await verifyPhoneOtp(req, res);
    } catch (error) {
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
      res.status(500).json({
        success: false,
        message: 'Failed to resend OTP'
      });
    }
  }
);

router.post('/check-user', checkUserExistence);


export default router;
