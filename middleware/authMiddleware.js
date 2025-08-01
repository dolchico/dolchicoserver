import jwt from 'jsonwebtoken';
import { getUserAuthStatus } from '../services/userService.js';

// Main authentication middleware (enhanced version of your existing one)
export const ensureAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded; // Contains: { userId, phoneNumber, role }
      return next();
    } catch (err) {
      console.error('JWT verification failed:', err.message);
      
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ 
          success: false,
          message: 'Token has expired. Please login again.',
          code: 'TOKEN_EXPIRED'
        });
      } else if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({ 
          success: false,
          message: 'Invalid token format.',
          code: 'INVALID_TOKEN'
        });
      }
      
      return res.status(401).json({ 
        success: false,
        message: 'Invalid or expired token',
        code: 'TOKEN_INVALID'
      });
    }
  }
  
  return res.status(401).json({ 
    success: false,
    message: 'Authentication required. Please provide a valid token.',
    code: 'NO_TOKEN'
  });
};

// NEW: Enhanced auth middleware that also checks user account status
export const ensureAuthWithStatus = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Get current user status from database
      const userStatus = await getUserAuthStatus(decoded.userId);
      
      // Check if user account is locked
      if (userStatus.isLocked) {
        return res.status(423).json({ 
          success: false,
          message: 'Account is temporarily locked. Please try again later.',
          code: 'ACCOUNT_LOCKED',
          lockUntil: userStatus.lockedUntil
        });
      }
      
      // Attach both JWT data and current user status to request
      req.user = decoded;
      req.userStatus = userStatus;
      
      return next();
      
    } catch (err) {
      console.error('Enhanced auth failed:', err.message);
      
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ 
          success: false,
          message: 'Token has expired. Please login again.',
          code: 'TOKEN_EXPIRED'
        });
      }
      
      return res.status(401).json({ 
        success: false,
        message: 'Invalid or expired token',
        code: 'TOKEN_INVALID'
      });
    }
  }
  
  return res.status(401).json({ 
    success: false,
    message: 'Authentication required',
    code: 'NO_TOKEN'
  });
};

// NEW: Middleware to ensure user has completed profile (for Myntra flow)
export const ensureProfileComplete = (req, res, next) => {
  // This middleware should be used after ensureAuthWithStatus
  if (!req.userStatus) {
    return res.status(500).json({ 
      success: false,
      message: 'User status not available. Use ensureAuthWithStatus middleware first.',
      code: 'MIDDLEWARE_ERROR'
    });
  }
  
  if (!req.userStatus.isProfileComplete) {
    return res.status(403).json({ 
      success: false,
      message: 'Profile completion required to access this resource.',
      code: 'PROFILE_INCOMPLETE',
      nextStep: 'profile-completion'
    });
  }
  
  return next();
};

// NEW: Middleware for phone verification requirement
export const ensurePhoneVerified = (req, res, next) => {
  if (!req.userStatus) {
    return res.status(500).json({ 
      success: false,
      message: 'User status not available. Use ensureAuthWithStatus middleware first.',
      code: 'MIDDLEWARE_ERROR'
    });
  }
  
  if (!req.userStatus.phoneVerified) {
    return res.status(403).json({ 
      success: false,
      message: 'Phone verification required to access this resource.',
      code: 'PHONE_NOT_VERIFIED',
      nextStep: 'phone-verification'
    });
  }
  
  return next();
};

// NEW: Role-based authorization middleware
export const ensureRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false,
        message: 'Authentication required',
        code: 'NO_AUTH'
      });
    }
    
    const userRole = req.user.role || 'USER';
    
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ 
        success: false,
        message: 'Insufficient permissions to access this resource.',
        code: 'INSUFFICIENT_PERMISSIONS',
        requiredRoles: allowedRoles,
        userRole: userRole
      });
    }
    
    return next();
  };
};

// NEW: Optional authentication middleware (for public endpoints that benefit from user context)
export const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
    } catch (err) {
      // Silently fail for optional auth - don't block the request
      console.log('Optional auth failed (expected for public endpoints):', err.message);
    }
  }
  
  // Always proceed to next middleware, regardless of auth status
  return next();
};

// NEW: Rate limiting helper for OTP endpoints
export const otpRateLimit = (maxAttempts = 5, timeWindowMinutes = 15) => {
  const attempts = new Map();
  
  return (req, res, next) => {
    const identifier = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();
    
    // Clean up old entries
    for (const [key, data] of attempts.entries()) {
      if (now - data.firstAttempt > timeWindowMinutes * 60 * 1000) {
        attempts.delete(key);
      }
    }
    
    // Check current attempts
    const userAttempts = attempts.get(identifier);
    
    if (userAttempts) {
      if (userAttempts.count >= maxAttempts) {
        const remainingTime = Math.ceil(
          (userAttempts.firstAttempt + timeWindowMinutes * 60 * 1000 - now) / 1000
        );
        
        return res.status(429).json({
          success: false,
          message: `Too many OTP requests. Please try again in ${Math.ceil(remainingTime / 60)} minutes.`,
          code: 'RATE_LIMITED',
          retryAfter: remainingTime
        });
      }
      
      userAttempts.count++;
    } else {
      attempts.set(identifier, { count: 1, firstAttempt: now });
    }
    
    return next();
  };
};

// Export all middleware functions
export default {
  ensureAuth,
  ensureAuthWithStatus,
  ensureProfileComplete,
  ensurePhoneVerified,
  ensureRole,
  optionalAuth,
  otpRateLimit
};
