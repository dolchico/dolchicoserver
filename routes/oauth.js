// routes/OAuthRoute.js (Updated without database sessions)
import express from 'express';
import passport from '../config/passport-setup.js';
import jwt from 'jsonwebtoken';

const router = express.Router();

// Google OAuth initiation
router.get('/google', 
  passport.authenticate('google', { 
    scope: ['profile', 'email'],
    accessType: 'offline',
    prompt: 'consent'
  })
);

// Google OAuth callback (simplified without database sessions)
router.get('/google/callback', 
  passport.authenticate('google', { 
    failureRedirect: `${process.env.FRONTEND_URL}/login?error=oauth-failed`,
    session: true 
  }),
  async (req, res) => {
    try {
      console.log('OAuth callback success for user:', req.user.id);
      
      const user = req.user;

      // Create JWT token (without database session)
      const jwtToken = jwt.sign(
        { 
          userId: user.id, 
          email: user.email,
          role: user.role || 'USER',
          loginMethod: 'google'
        },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      // Set secure cookie
      res.cookie('auth-token', jwtToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      // Determine redirect based on profile completion
      const redirectUrl = user.isProfileComplete 
        ? `${process.env.FRONTEND_URL}/dashboard?auth=success&new_user=false`
        : `${process.env.FRONTEND_URL}/complete-profile?auth=success&new_user=true`;

      console.log('Redirecting to:', redirectUrl);
      res.redirect(redirectUrl);
      
    } catch (error) {
      console.error('OAuth callback error:', error);
      res.redirect(`${process.env.FRONTEND_URL}/login?error=callback-failed`);
    }
  }
);

// Logout (simplified)
router.post('/logout', async (req, res) => {
  try {
    // Clear cookie
    res.clearCookie('auth-token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    });
    
    // Logout from passport session
    req.logout((err) => {
      if (err) {
        console.error('Passport logout error:', err);
        return res.status(500).json({ success: false, message: 'Logout failed' });
      }
      
      res.json({ success: true, message: 'Logged out successfully' });
    });
    
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ success: false, message: 'Logout failed' });
  }
});

// Get current user profile
router.get('/profile', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Not authenticated' 
      });
    }

    res.json({
      success: true,
      user: {
        id: req.user.id,
        email: req.user.email,
        name: req.user.name,
        phoneNumber: req.user.phoneNumber,
        emailVerified: req.user.emailVerified,
        phoneVerified: req.user.phoneVerified,
        isProfileComplete: req.user.isProfileComplete,
        role: req.user.role,
        lastLoginAt: req.user.lastLoginAt
      }
    });
    
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch profile' 
    });
  }
});

export default router;
