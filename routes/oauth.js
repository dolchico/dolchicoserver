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
router.get('/google/callback',
  passport.authenticate('google', {
    failureRedirect: `${process.env.FRONTEND_URL}/login?error=oauth-failed`,
    session: false // We use JWTs, not sessions
  }),
  AuthController.handleGoogleCallback
);

// Logout endpoint
router.post('/logout', AuthController.logout);

// Get current user profile
router.get('/profile', AuthController.getProfile);

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'Google OAuth' });
});

export default router;
