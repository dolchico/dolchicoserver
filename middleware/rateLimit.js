import rateLimit from 'express-rate-limit';

// Global API rate limiter
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Max 100 requests per IP
  message: 'Too many requests, please try again later.',
});

// Specific limiter for login/auth routes
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Max 10 login attempts per IP
  message: 'Too many login attempts. Please try again later.',
});
