// middleware/authMiddleware.js - Consolidated and enhanced version
// This file combines your existing auth.js functionality with additional features
// Use this as your main auth middleware file. Export ensureAuth for simple token verification
// and other enhanced middlewares as needed.
import jwt from 'jsonwebtoken';
import { getUserAuthStatus } from '../services/userService.js'; // Assuming this exists; remove if not needed
// Simple ensureAuth - similar to your original auth.js but streamlined
export const ensureAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Not Authorized. Login again.',
      code: 'NO_TOKEN'
    });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
   
    // Handle both 'id' and 'userId' in token
    const userId = decoded.id ?? decoded.userId;
   
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token format',
        code: 'INVALID_TOKEN_FORMAT'
      });
    }
    req.user = { ...decoded, id: userId, userId }; // Ensure both keys are present
    next();
  } catch (error) {
    console.error('Auth Error:', error.message);
   
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired. Please login again.',
        code: 'TOKEN_EXPIRED'
      });
    }
   
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token',
        code: 'INVALID_TOKEN'
      });
    }
    res.status(401).json({
      success: false,
      message: 'Authentication failed',
      code: 'AUTH_FAILED'
    });
  }
};
// Enhanced auth middleware that also checks user account status
export const ensureAuthWithStatus = async (req, res, next) => {
  await ensureAuth(req, res, async () => {
    try {
      const userId = req.user.id;
     
      // Get current user status from database (if service exists)
      let userStatus = { isActive: true, isLocked: false, isProfileComplete: true, phoneVerified: true };
      if (typeof getUserAuthStatus === 'function') {
        userStatus = await getUserAuthStatus(userId);
      }
     
      // Check if user account is locked
      if (userStatus.isLocked) {
        return res.status(423).json({
          success: false,
          message: 'Account is temporarily locked. Please try again later.',
          code: 'ACCOUNT_LOCKED',
          lockUntil: userStatus.lockedUntil
        });
      }
     
      // Check if user is active
      if (!userStatus.isActive) {
        return res.status(403).json({
          success: false,
          message: 'Account is deactivated.',
          code: 'ACCOUNT_INACTIVE'
        });
      }
     
      req.userStatus = userStatus;
      next();
    } catch (error) {
      console.error('User status check failed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to verify user status',
        code: 'STATUS_CHECK_FAILED'
      });
    }
  });
};
// Middleware to ensure user has completed profile
export const ensureProfileComplete = (req, res, next) => {
  if (!req.userStatus || !req.userStatus.isProfileComplete) {
    return res.status(403).json({
      success: false,
      message: 'Profile completion required to access this resource.',
      code: 'PROFILE_INCOMPLETE',
      nextStep: 'profile-completion'
    });
  }
  next();
};
// Middleware for phone verification requirement
export const ensurePhoneVerified = (req, res, next) => {
  if (!req.userStatus || !req.userStatus.phoneVerified) {
    return res.status(403).json({
      success: false,
      message: 'Phone verification required to access this resource.',
      code: 'PHONE_NOT_VERIFIED',
      nextStep: 'phone-verification'
    });
  }
  next();
};
// Role-based authorization middleware
export const ensureRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'NO_AUTH'
      });
    }
   
    const userRole = (req.user.role || '').toLowerCase();
    const normalizedAllowedRoles = allowedRoles.map(role => (role || '').toLowerCase());
   
    if (!normalizedAllowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions to access this resource.',
        code: 'INSUFFICIENT_PERMISSIONS',
        requiredRoles: allowedRoles,
        userRole: userRole
      });
    }
   
    next();
  };
};
// Admin-specific authorization middleware
export const ensureAdmin = (req, res, next) => {
  if (!req.user || (req.user.role || '').toLowerCase() !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Admin access required.'
    });
  }
  next();
};
// Optional authentication middleware
export const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
 
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
   
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
    } catch (err) {
      // Silently fail
      console.log('Optional auth failed:', err.message);
    }
  }
 
  next();
};
// Rate limiting helper for OTP endpoints
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
   
    next();
  };
};
// Legacy authMiddleware for backward compatibility (simple version)
export const authMiddleware = ensureAuth;
// Default export for easy import (all middlewares)
export default {
  ensureAuth,
  ensureAuthWithStatus,
  ensureProfileComplete,
  ensurePhoneVerified,
  ensureRole,
  ensureAdmin,
  optionalAuth,
  otpRateLimit,
  authMiddleware
};