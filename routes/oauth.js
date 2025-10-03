import express from 'express';
import passport from '../config/passport-setup.js';
import { AuthController } from '../controllers/OAuthController.js';
import jwt from 'jsonwebtoken';
const router = express.Router();
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// Start Google OAuth flow
router.get(
  '/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    accessType: 'offline',
    prompt: 'consent',
  })
);

// Handle Google OAuth callback
router.get(
  '/google/callback',
  passport.authenticate('google', {
    failureRedirect: `${process.env.FRONTEND_URL}/login?error=oauth_failed`,
  }),
  async (req, res) => {
    try {
      // Validate user data from Passport
      if (!req.user || !req.user.id) {
        throw new Error('User data not provided by OAuth');
      }

      // Generate JWT token
      const token = jwt.sign(
        { id: req.user.id }, // String UUID
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      // Set secure cookie
      res.cookie('auth-token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      // Redirect with token and user data
      const userStr = encodeURIComponent(
        JSON.stringify({
          id: req.user.id,
          name: req.user.name,
          email: req.user.email,
          role: req.user.role,
        })
      );

      res.redirect(`${process.env.FRONTEND_URL}/login?auth=success&token=${token}&user=${userStr}`);
    } catch (error) {
      console.error('OAuth callback error:', error);
      res.redirect(`${process.env.FRONTEND_URL}/login?error=oauth_error`);
    }
  }
);

// Logout endpoint
router.post('/logout', AuthController.logout);

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
    req.userId = decoded.id; // String UUID
    next();
  });
};

// Get user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    // Validate userId
    if (!req.userId || typeof req.userId !== 'string') {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    // Check database connection
    if (!prisma) {
      return res.status(500).json({ message: 'Database connection not available' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.userId }, // Use string userId
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        emailVerified: true,
        isProfileComplete: true,
      },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      success: true,
      user,
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ message: `Failed to fetch profile: ${error.message}` });
  }
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'Google OAuth' });
});

export default router;