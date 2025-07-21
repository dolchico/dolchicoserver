import passport from '../config/passport.js';
import { 
  forgotPasswordService, 
  resetPasswordService,
  updateUserProfile,
  deleteUserData 
} from '../services/authService.js';
import { sendWelcomeEmail } from '../services/mailService.js';
import { sendResetPasswordEmail } from '../services/mailService.js';
import { ValidationError, NotFoundError } from '../utils/errors.js';
import { PrismaClient } from '@prisma/client';
import logger from '../logger.js';

const prisma = new PrismaClient();

/**
 * CONTROLLER for POST /forgot-password
 */
export const forgotPassword = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ success: false, message: 'Email is required.' });
  }

  try {
    const result = await forgotPasswordService(email);

    // If a user was found, the service returns data needed to send the email.
    if (result) {
      try {
        await sendResetPasswordEmail(result.email, result.userName, result.token);
      } catch (mailError) {
        // Log the email error for debugging, but do not expose it to the client.
        // The process continues to send a generic success message for security.
        logger.error('CRITICAL: Failed to send password reset email:', mailError);
      }
    }

    // Always return a generic success message to prevent attackers from guessing emails.
    return res.status(200).json({
      success: true,
      message: 'If an account with that email exists, a reset link has been sent.',
    });
  } catch (error) {
    logger.error('Forgot Password Controller Error:', error);
    return res.status(500).json({ success: false, message: 'An internal server error occurred.' });
  }
};

/**
 * CONTROLLER for POST /reset-password
 */
export const resetPassword = async (req, res) => {
  const { token, newPassword } = req.body;

  try {
    await resetPasswordService(token, newPassword);
    res.status(200).json({ success: true, message: 'Password has been reset successfully.' });
  } catch (err) {
    logger.error('Reset Password Controller Error:', err);

    // Handle specific errors thrown by the service layer
    if (err instanceof ValidationError) {
      return res.status(err.statusCode).json({ success: false, message: err.message });
    }
    if (err instanceof NotFoundError) {
      return res.status(err.statusCode).json({ success: false, message: err.message });
    }

    // Fallback for any other unexpected errors
    res.status(500).json({ success: false, message: 'An internal server error occurred.' });
  }
};

/**
 * Facebook OAuth initiation
 */
export const facebookAuth = (req, res, next) => {
  // Store redirect URL in session if provided
  if (req.query.redirect) {
    req.session.redirectUrl = req.query.redirect;
  }
  
  // Check if linking existing account
  if (req.query.link === 'true' && req.isAuthenticated()) {
    req.session.linkingUserId = req.user.id;
  }
  
  passport.authenticate('facebook', {
    scope: ['email']
  })(req, res, next);
};

/**
 * Facebook OAuth callback
 */
export const facebookCallback = (req, res, next) => {
  passport.authenticate('facebook', {
    // ... existing code
  }, async (err, user, info) => {
    // ... existing authentication logic

    if (user && !user.lastLoginAt) { // New user
      try {
        await sendWelcomeEmail(user.email, user.name, 'Facebook');
      } catch (emailError) {
        logger.warn('Welcome email failed:', emailError);
        // Don't fail the login for email issues
      }
    }

    // ... rest of callback logic
  })(req, res, next);
};
/**
 * Google OAuth initiation
 */
export const googleAuth = (req, res, next) => {
  // Store redirect URL in session if provided
  if (req.query.redirect) {
    req.session.redirectUrl = req.query.redirect;
  }
  
  // Check if linking existing account
  if (req.query.link === 'true' && req.isAuthenticated()) {
    req.session.linkingUserId = req.user.id;
  }
  
  passport.authenticate('google', {
    scope: ['profile', 'email']
  })(req, res, next);
};

/**
 * Google OAuth callback
 */
export const googleCallback = (req, res, next) => {
  passport.authenticate('google', {
    failureRedirect: `${process.env.FRONTEND_URL || 'https://dolchico.com'}/auth/login?error=google_auth_failed`,
    failureFlash: false
  }, (err, user, info) => {
    if (err) {
      logger.error('Google OAuth Error:', err);
      return res.redirect(`${process.env.FRONTEND_URL || 'https://dolchico.com'}/auth/login?error=authentication_failed`);
    }

    if (!user) {
      return res.redirect(`${process.env.FRONTEND_URL || 'https://dolchico.com'}/auth/login?error=google_auth_failed`);
    }

    // Check if user account is active
    if (!user.isActive) {
      return res.redirect(`${process.env.FRONTEND_URL || 'https://dolchico.com'}/auth/login?error=account_deactivated`);
    }

    req.logIn(user, (err) => {
      if (err) {
        logger.error('Session Error:', err);
        return res.redirect(`${process.env.FRONTEND_URL || 'https://dolchico.com'}/auth/login?error=session_failed`);
      }

      // Redirect to stored URL or dashboard
      const redirectUrl = req.session.redirectUrl || `${process.env.FRONTEND_URL || 'https://dolchico.com'}/dashboard`;
      delete req.session.redirectUrl;
      delete req.session.linkingUserId;
      
      return res.redirect(redirectUrl);
    });
  })(req, res, next);
};

/**
 * Get current user profile
 */
export const getProfile = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }

    // Fetch fresh user data
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        firstName: true,
        lastName: true,
        avatar: true,
        role: true,
        emailVerified: true,
        phoneVerified: true,
        phoneNumber: true,
        googleId: true,
        facebookId: true,
        createdAt: true,
        lastLoginAt: true
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          firstName: user.firstName,
          lastName: user.lastName,
          avatar: user.avatar,
          role: user.role,
          emailVerified: user.emailVerified,
          phoneVerified: user.phoneVerified,
          phoneNumber: user.phoneNumber,
          linkedAccounts: {
            google: !!user.googleId,
            facebook: !!user.facebookId
          },
          createdAt: user.createdAt,
          lastLoginAt: user.lastLoginAt
        }
      }
    });
  } catch (error) {
    logger.error('Profile Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile'
    });
  }
};

/**
 * Update user profile
 */
export const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { firstName, lastName, phoneNumber, name } = req.body;

    // Validate input
    if (phoneNumber && !/^\+?[\d\s\-\(\)]{10,20}$/.test(phoneNumber)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid phone number format'
      });
    }

    const updateData = {};
    if (firstName !== undefined) updateData.firstName = firstName.trim();
    if (lastName !== undefined) updateData.lastName = lastName.trim();
    if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber.trim() || null;
    if (name !== undefined) updateData.name = name.trim();

    // Auto-generate name if first/last names provided but name not provided
    if ((firstName || lastName) && !name) {
      updateData.name = `${firstName?.trim() || ''} ${lastName?.trim() || ''}`.trim();
    }

    const updatedUser = await updateUserProfile(userId, updateData);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: { user: updatedUser }
    });
  } catch (error) {
    if (error.code === 'P2002' && error.meta?.target?.includes('phoneNumber')) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is already taken'
      });
    }
    
    logger.error('Update Profile Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile'
    });
  }
};

/**
 * Logout
 */
export const logout = (req, res) => {
  req.logout((err) => {
    if (err) {
      logger.error('Logout Error:', err);
      return res.status(500).json({
        success: false,
        message: 'Logout failed'
      });
    }
    
    req.session.destroy((err) => {
      if (err) {
        logger.error('Session Destroy Error:', err);
      }
      res.clearCookie('connect.sid');
      res.json({
        success: true,
        message: 'Logged out successfully'
      });
    });
  });
};

/**
 * Check authentication status
 */
export const checkAuthStatus = (req, res) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return res.json({
      success: true,
      authenticated: true,
      user: {
        id: req.user.id,
        email: req.user.email,
        name: req.user.name,
        role: req.user.role,
        emailVerified: req.user.emailVerified,
        avatar: req.user.avatar
      }
    });
  }

  res.json({
    success: true,
    authenticated: false,
    user: null
  });
};

/**
 * Handle Facebook data deletion callback (required by Facebook)
 */
export const handleDataDeletion = async (req, res) => {
  try {
    const { signed_request } = req.body;
    
    if (!signed_request) {
      return res.status(400).json({ 
        error: 'Missing signed_request' 
      });
    }

    // Log the deletion request for compliance
    logger.info('Facebook data deletion request received:', { 
      signed_request,
      timestamp: new Date().toISOString(),
      ip: req.ip
    });

    // Generate unique confirmation code
    const confirmationCode = `DEL_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // In production, you should:
    // 1. Decode the signed_request to get user info
    // 2. Store the deletion request in database
    // 3. Process actual deletion (or mark for deletion)
    
    // Store deletion request
    await prisma.dataDeletionRequest.create({
      data: {
        provider: 'facebook',
        providerUserId: 'unknown', // Would be extracted from signed_request
        confirmationCode,
        status: 'PENDING'
      }
    });

    res.json({
      url: `${process.env.FRONTEND_URL || 'https://dolchico.com'}/data-deletion-status/${confirmationCode}`,
      confirmation_code: confirmationCode
    });
  } catch (error) {
    logger.error('Data deletion request failed:', error);
    res.status(500).json({ 
      error: 'Failed to process deletion request' 
    });
  }
};

/**
 * Get data deletion status
 */
export const getDataDeletionStatus = async (req, res) => {
  try {
    const { confirmationCode } = req.params;
    
    const deletionRequest = await prisma.dataDeletionRequest.findUnique({
      where: { confirmationCode }
    });
    
    if (!deletionRequest) {
      return res.status(404).json({
        success: false,
        message: 'Deletion request not found'
      });
    }
    
    res.json({
      success: true,
      data: {
        status: deletionRequest.status,
        requestedAt: deletionRequest.requestedAt,
        completedAt: deletionRequest.completedAt
      }
    });
  } catch (error) {
    logger.error('Get deletion status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get deletion status'
    });
  }
};
