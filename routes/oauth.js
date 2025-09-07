import express from 'express';
import passport from '../config/passport-setup.js';
import { AuthController } from '../controllers/OAuthController.js';

const router = express.Router();

// Start Google OAuth flow
router.get('/google', 
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    accessType: 'offline',
    prompt: 'consent'
  })
);

// Handle Google OAuth callback
// In your backend OAuth route (e.g., authRoutes.js)
router.get('/google/callback', 
  passport.authenticate('google', { 
    failureRedirect: `${process.env.FRONTEND_URL}/login?error=oauth_failed` 
  }),
  async (req, res) => {
    try {
      // Generate JWT token
      const token = jwt.sign(
        { 
          userId: req.user.id, 
          email: req.user.email,
          role: req.user.role 
        },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      // Set secure cookie
      res.cookie('auth-token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      // Redirect with token and user data
      const userStr = encodeURIComponent(JSON.stringify({
        id: req.user.id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role
      }));

      res.redirect(
        `${process.env.FRONTEND_URL}/login?auth=success&token=${token}&user=${userStr}`
      );
    } catch (error) {
      console.error('OAuth callback error:', error);
      res.redirect(`${process.env.FRONTEND_URL}/login?error=oauth_error`);
    }
  }
);


// Logout endpoint
router.post('/logout', AuthController.logout);

// Get current user profile
// router.get('/profile', AuthController.getProfile);

// Add this route to verify tokens


// Middleware to authenticate token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token' });
    }
    req.userId = decoded.userId;
    next();
  });
};
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        emailVerified: user.emailVerified,
        isProfileComplete: user.isProfileComplete
      }
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'Google OAuth' });
});

export default router;
