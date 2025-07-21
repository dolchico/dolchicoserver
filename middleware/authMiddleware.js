import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { PrismaClient } from '@prisma/client';
import logger from '../logger.js';

const prisma = new PrismaClient();

// JWT Authentication middleware
export const ensureAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Fetch fresh user data from database
      const user = await prisma.user.findUnique({
        where: { id: Number(decoded.id) },
        select: {
          id: true,
          email: true,
          name: true,
          firstName: true,
          lastName: true,
          avatar: true,
          role: true,
          isActive: true,
          emailVerified: true,
          phoneVerified: true,
          phoneNumber: true,
          googleId: true,
          facebookId: true
        }
      });
      
      if (!user) {
        return res.status(401).json({ 
          success: false,
          message: 'User not found' 
        });
      }
      
      if (!user.isActive) {
        return res.status(403).json({ 
          success: false,
          message: 'Account is deactivated' 
        });
      }
      
      req.user = user;
      return next();
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ 
          success: false,
          message: 'Token expired',
          code: 'TOKEN_EXPIRED'
        });
      }
      if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({ 
          success: false,
          message: 'Invalid token',
          code: 'INVALID_TOKEN'
        });
      }
      logger.error('JWT verification failed:', err);
      return res.status(401).json({ 
        success: false,
        message: 'Token verification failed',
        code: 'VERIFICATION_FAILED'
      });
    }
  }
  
  return res.status(401).json({ 
    success: false,
    message: 'Authentication required',
    code: 'NO_TOKEN'
  });
};

// Optional JWT authentication (doesn't fail if no token)
export const optionalJWTAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      const user = await prisma.user.findUnique({
        where: { id: Number(decoded.id) },
        select: {
          id: true,
          email: true,
          name: true,
          firstName: true,
          lastName: true,
          avatar: true,
          role: true,
          isActive: true,
          emailVerified: true,
          phoneVerified: true,
          googleId: true,
          facebookId: true
        }
      });
      
      if (user && user.isActive) {
        req.user = user;
      }
    } catch (err) {
      // Silently fail for optional auth
      logger.debug('Optional JWT auth failed:', err.message);
    }
  }
  
  next();
};

// Rate limiting for OAuth endpoints
export const oauthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // Increased limit for OAuth flows
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later',
    retryAfter: 900 // seconds
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for successful callbacks and certain routes
    return req.user !== undefined || req.path.includes('/status');
  },
  keyGenerator: (req) => {
    // Use IP + User-Agent for better accuracy
    return `${req.ip}-${req.get('User-Agent')?.slice(0, 50) || 'unknown'}`;
  }
});

// Rate limiting for API endpoints
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Increased for better UX
  message: {
    success: false,
    message: 'Too many requests, please try again later',
    retryAfter: 900
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip for authenticated users (they get higher limits)
    return req.user !== undefined;
  }
});

// Rate limiting for authentication endpoints (stricter)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 8, // Slightly increased for UX
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later',
    retryAfter: 900
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
  keyGenerator: (req) => {
    return `auth-${req.ip}-${req.get('User-Agent')?.slice(0, 30) || 'unknown'}`;
  }
});

// Strict rate limiting for password reset
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Only 3 password reset attempts per hour
  message: {
    success: false,
    message: 'Too many password reset attempts, please try again in an hour',
    retryAfter: 3600
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `pwd-reset-${req.ip}`
});

// Session-based authentication middleware (for OAuth)
export const requireAuth = (req, res, next) => {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
      code: 'NOT_AUTHENTICATED'
    });
  }
  
  if (!req.user || !req.user.isActive) {
    return res.status(403).json({
      success: false,
      message: 'Account is deactivated',
      code: 'ACCOUNT_DEACTIVATED'
    });
  }
  
  next();
};

// Optional session authentication middleware
export const optionalAuth = (req, res, next) => {
  // Continue regardless of authentication status
  next();
};

// Admin role middleware
export const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
      code: 'NOT_AUTHENTICATED'
    });
  }
  
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({
      success: false,
      message: 'Admin access required',
      code: 'INSUFFICIENT_PERMISSIONS'
    });
  }
  
  next();
};

// Moderator or Admin role middleware
export const requireModerator = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
      code: 'NOT_AUTHENTICATED'
    });
  }
  
  if (!['ADMIN', 'MODERATOR'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Moderator or Admin access required',
      code: 'INSUFFICIENT_PERMISSIONS'
    });
  }
  
  next();
};

// Verified email middleware
export const requireVerifiedEmail = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
      code: 'NOT_AUTHENTICATED'
    });
  }
  
  if (!req.user.emailVerified) {
    return res.status(403).json({
      success: false,
      message: 'Email verification required',
      code: 'EMAIL_NOT_VERIFIED'
    });
  }
  
  next();
};

// Verified phone middleware
export const requireVerifiedPhone = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
      code: 'NOT_AUTHENTICATED'
    });
  }
  
  if (!req.user.phoneVerified) {
    return res.status(403).json({
      success: false,
      message: 'Phone verification required',
      code: 'PHONE_NOT_VERIFIED'
    });
  }
  
  next();
};

// Combined JWT + Session auth middleware
export const flexibleAuth = async (req, res, next) => {
  // Try session auth first (faster)
  if (req.isAuthenticated && req.isAuthenticated()) {
    if (!req.user || !req.user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated',
        code: 'ACCOUNT_DEACTIVATED'
      });
    }
    return next();
  }
  
  // Try JWT auth
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      const user = await prisma.user.findUnique({
        where: { id: Number(decoded.id) },
        select: {
          id: true,
          email: true,
          name: true,
          firstName: true,
          lastName: true,
          avatar: true,
          role: true,
          isActive: true,
          emailVerified: true
        }
      });
      
      if (user && user.isActive) {
        req.user = user;
        return next();
      }
    } catch (err) {
      // JWT failed, continue to error response
      logger.debug('JWT auth failed in flexibleAuth:', err.message);
    }
  }
  
  return res.status(401).json({
    success: false,
    message: 'Authentication required',
    code: 'NOT_AUTHENTICATED'
  });
};

// Optional flexible auth (doesn't fail)
export const optionalFlexibleAuth = async (req, res, next) => {
  // Try session auth first
  if (req.isAuthenticated && req.isAuthenticated() && req.user && req.user.isActive) {
    return next();
  }
  
  // Try JWT auth
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      const user = await prisma.user.findUnique({
        where: { id: Number(decoded.id) },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          emailVerified: true
        }
      });
      
      if (user && user.isActive) {
        req.user = user;
      }
    } catch (err) {
      // Silently fail for optional auth
      logger.debug('Optional flexible auth failed:', err.message);
    }
  }
  
  next();
};

// Owner or Admin middleware (for resource access)
export const requireOwnerOrAdmin = (resourceUserIdField = 'userId') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'NOT_AUTHENTICATED'
      });
    }
    
    // Admin can access anything
    if (req.user.role === 'ADMIN') {
      return next();
    }
    
    // Check if user owns the resource
    const resourceUserId = req.params[resourceUserIdField] || req.body[resourceUserIdField];
    if (resourceUserId && Number(resourceUserId) === req.user.id) {
      return next();
    }
    
    return res.status(403).json({
      success: false,
      message: 'Access denied',
      code: 'ACCESS_DENIED'
    });
  };
};

// Error handling middleware for auth errors
export const handleAuthError = (err, req, res, next) => {
  logger.error('Auth error middleware:', err);
  
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token',
      code: 'UNAUTHORIZED'
    });
  }
  
  if (err.message === 'No authorization token was found') {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
      code: 'NO_TOKEN'
    });
  }
  
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expired',
      code: 'TOKEN_EXPIRED'
    });
  }
  
  next(err);
};

// Security headers middleware
export const securityHeaders = (req, res, next) => {
  // Remove server header
  res.removeHeader('X-Powered-By');
  
  // Add security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  next();
};

// Request logging middleware
export const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: req.user?.id
    };
    
    if (res.statusCode >= 400) {
      logger.error('Request failed:', logData);
    } else {
      logger.info('Request completed:', logData);
    }
  });
  
  next();
};

export default {
  ensureAuth,
  optionalJWTAuth,
  oauthLimiter,
  apiLimiter,
  authLimiter,
  passwordResetLimiter,
  requireAuth,
  optionalAuth,
  requireAdmin,
  requireModerator,
  requireVerifiedEmail,
  requireVerifiedPhone,
  flexibleAuth,
  optionalFlexibleAuth,
  requireOwnerOrAdmin,
  handleAuthError,
  securityHeaders,
  requestLogger
};
