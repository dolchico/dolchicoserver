import { AuthService } from '../services/OAuthService.js';

export class AuthController {
  static async handleGoogleCallback(req, res) {
    try {
      console.log('[AuthController] Processing Google callback');

      if (!req.user) {
        console.error('[AuthController] No user found in request');
        return res.redirect(`${process.env.FRONTEND_URL}/login?error=no-user`);
      }

      const user = req.user;
      console.log('[AuthController] User found:', user.id, user.email);

      // Check if user needs verification
      if (!AuthService.isUserFullyVerified(user)) {
        console.log('[AuthController] User needs verification, redirecting to OTP flow');
        
        // Determine which verification is needed
        const needsEmailVerification = user.email && !user.emailVerified;
        const needsPhoneVerification = user.phoneNumber && !user.phoneVerified;
        
        if (needsEmailVerification) {
          return res.redirect(`${process.env.FRONTEND_URL}/auth?step=2&contact=${encodeURIComponent(user.email)}&type=email&verify=true`);
        }
        
        if (needsPhoneVerification) {
          return res.redirect(`${process.env.FRONTEND_URL}/auth?step=2&contact=${encodeURIComponent(user.phoneNumber)}&type=mobile&verify=true`);
        }
      }

      // Generate JWT token
      const token = AuthService.generateJWT(user);
      console.log('[AuthController] JWT generated successfully');

      // Set secure cookie
      const isProduction = process.env.NODE_ENV === 'production';
      res.cookie('auth-token', token, AuthService.getCookieOptions(isProduction));

      // Redirect to home
      const redirectUrl = `${process.env.FRONTEND_URL}/home?auth=success`;
      console.log('[AuthController] Redirecting to:', redirectUrl);
      
      return res.redirect(redirectUrl);

    } catch (error) {
      console.error('[AuthController] OAuth callback error:', error);
      return res.redirect(`${process.env.FRONTEND_URL}/login?error=callback-failed`);
    }
  }

  static async logout(req, res) {
    try {
      const isProduction = process.env.NODE_ENV === 'production';
      
      res.clearCookie('auth-token', {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax',
      });

      // Handle passport session cleanup
      req.logout((err) => {
        if (err) {
          console.error('[AuthController] Logout error:', err);
        }
      });

      res.json({ success: true, message: 'Logged out successfully' });
    } catch (error) {
      console.error('[AuthController] Logout error:', error);
      res.status(500).json({ success: false, message: 'Logout failed' });
    }
  }

  static async getProfile(req, res) {
    try {
      const token = req.cookies?.['auth-token'];
      
      if (!token) {
        return res.status(401).json({ 
          success: false, 
          message: 'Not authenticated - no token' 
        });
      }

      const payload = AuthService.verifyJWT(token);
      
      // Get fresh user data from database
      const user = await AuthService.getUserProfile(payload.userId);
      
      if (!user) {
        return res.status(401).json({ 
          success: false, 
          message: 'User not found' 
        });
      }

      res.json({
        success: true,
        user: {
          ...payload,
          ...user, // Override with fresh data
        },
      });

    } catch (error) {
      console.error('[AuthController] Profile fetch error:', error);
      
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({ 
          success: false, 
          message: 'Invalid token' 
        });
      }
      
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch profile' 
      });
    }
  }
}
