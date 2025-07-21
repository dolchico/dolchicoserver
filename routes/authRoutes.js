import express from 'express';
import passport from '../config/passport.js';
import { 
  forgotPassword, 
  resetPassword, 
  facebookAuth,
  facebookCallback,
  googleAuth,
  googleCallback,
  getProfile,
  logout,
  checkAuthStatus,
  updateProfile,
  handleDataDeletion
} from '../controllers/authController.js';
import { oauthLimiter, authLimiter, requireAuth, apiLimiter } from '../middleware/authMiddleware.js';
import logger from '../logger.js';

const router = express.Router();

// Password Reset Routes
router.post('/forgot-password', authLimiter, forgotPassword);
router.post('/reset-password', authLimiter, resetPassword);

// Google OAuth Routes
router.get('/google', 
  oauthLimiter,
  googleAuth
);

router.get('/google/callback',
  oauthLimiter,
  googleCallback
);

// Facebook OAuth Routes
router.get('/facebook', 
  oauthLimiter,
  facebookAuth
);

router.get('/facebook/callback',
  oauthLimiter,
  facebookCallback
);

// Facebook Data Deletion Callback (Required by Facebook)
router.post('/facebook/data-deletion', apiLimiter, handleDataDeletion);

// Profile Routes
router.get('/profile', 
  requireAuth, 
  getProfile
);

// Update Profile Route
router.put('/profile', 
  requireAuth,
  authLimiter,
  updateProfile
);

// Auth Status Check
router.get('/status', checkAuthStatus);

// Logout Route
router.post('/logout', 
  requireAuth, 
  logout
);

// Legacy logout route (GET) for backward compatibility
router.get('/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    req.session.destroy((err) => {
      if (err) console.error('Session destroy error:', err);
      res.clearCookie('connect.sid');
      res.redirect('/');
    });
  });
});

// Account linking routes
router.post('/link/google', requireAuth, async (req, res) => {
  try {
    // Store user ID in session for linking
    req.session.linkingUserId = req.user.id;
    res.redirect('/api/auth/google');
  } catch (error) {
    logger.error('Google linking error:', error);
    res.status(500).json({ success: false, message: 'Failed to initiate Google linking' });
  }
});

router.post('/link/facebook', requireAuth, async (req, res) => {
  try {
    // Store user ID in session for linking
    req.session.linkingUserId = req.user.id;
    res.redirect('/api/auth/facebook');
  } catch (error) {
    logger.error('Facebook linking error:', error);
    res.status(500).json({ success: false, message: 'Failed to initiate Facebook linking' });
  }
});

// Unlink OAuth accounts
router.delete('/unlink/:provider', requireAuth, async (req, res) => {
  try {
    const { provider } = req.params;
    const userId = req.user.id;
    
    if (!['google', 'facebook'].includes(provider)) {
      return res.status(400).json({ success: false, message: 'Invalid provider' });
    }

    // Check if user has password before unlinking (prevent lockout)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { password: true, googleId: true, facebookId: true }
    });

    const hasPassword = !!user.password;
    const hasOtherOAuth = provider === 'google' ? !!user.facebookId : !!user.googleId;

    if (!hasPassword && !hasOtherOAuth) {
      return res.status(400).json({
        success: false,
        message: 'Cannot unlink the only login method. Please set a password first.'
      });
    }

    // Remove OAuth ID
    const updateData = provider === 'google' 
      ? { googleId: null }
      : { facebookId: null };

    await prisma.user.update({
      where: { id: userId },
      data: updateData
    });

    // Remove from accounts table if exists
    await prisma.account.deleteMany({
      where: {
        userId: userId,
        provider: provider
      }
    });

    res.json({
      success: true,
      message: `${provider.charAt(0).toUpperCase() + provider.slice(1)} account unlinked successfully`
    });

  } catch (error) {
    logger.error(`${req.params.provider} unlinking error:`, error);
    res.status(500).json({ success: false, message: 'Failed to unlink account' });
  }
});

// Get linked accounts
router.get('/linked-accounts', requireAuth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        googleId: true,
        facebookId: true,
        password: true,
        email: true
      }
    });

    res.json({
      success: true,
      data: {
        linkedAccounts: {
          google: !!user.googleId,
          facebook: !!user.facebookId,
          email: !!user.password
        },
        canUnlink: {
          google: !!user.googleId && (!!user.password || !!user.facebookId),
          facebook: !!user.facebookId && (!!user.password || !!user.googleId)
        }
      }
    });
  } catch (error) {
    logger.error('Get linked accounts error:', error);
    res.status(500).json({ success: false, message: 'Failed to get linked accounts' });
  }
});

router.get('/test-email', async (req, res) => {
  try {
    await sendResetPasswordEmail('akashthanda14@gmail.com', 'Test User', 'test-token-123');
    res.json({ success: true, message: 'Test email sent successfully via Resend!' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
