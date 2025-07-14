import rateLimit from 'express-rate-limit';

// Rate limiter for OTP requests (per phone number)
export const otpRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour window
  max: 5, // limit each phone number to 5 OTP requests per hour
  keyGenerator: (req) => req.body.phoneNumber || req.ip, // use phoneNumber as key
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many OTP requests. Please try again later.',
    });
  },
});

export const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // limit each IP to 5 requests per windowMs
  message: 'Too many authentication attempts, please try again in an hour',
  standardHeaders: true,
  legacyHeaders: false,
});
