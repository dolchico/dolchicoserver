import express from 'express';
import { generateTicket } from '../controllers/ticketController.js';
import { ensureAuthWithStatus } from "../middleware/authMiddleware.js";
import { rateLimiter } from "../middleware/rateLimit.js";

const router = express.Router();

// Rate limiter specifically for ticket creation - 5 requests per hour
const ticketRateLimiter = rateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // 5 requests per hour
    message: {
        success: false,
        message: 'Too many ticket creation requests. Please try again later.',
        error: 'RATE_LIMITED',
        retryAfter: 3600 // 1 hour in seconds
    }
});

/**
 * @route POST /api/ticket/generate
 * @desc Generate a support ticket
 * @access Public (with optional authentication)
 */
router.post('/generate', 
    ticketRateLimiter,
    ensureAuthWithStatus({ optional: true }), // Optional authentication
    generateTicket
);

export const findUserByEmail = async (email) => {
    if (!email) return null;
    try {
        return await prisma.user.findUnique({
            where: { email: email.trim().toLowerCase() },
        });
    } catch (error) {
        // Check if the error is related to the missing dob column
        if (error.code === 'P2022' && error.meta?.column === 'users.dob') {
            // Fallback query without automatically selecting the problematic field
            return await prisma.$queryRaw`
                SELECT id, name, email, password, "phoneNumber", "emailVerified", 
                "phoneVerified", "isProfileComplete", "isActive", role, "createdAt", 
                "updatedAt", "resetToken", "resetTokenExpiry", "pendingEmail", 
                "pendingEmailOtp", "pendingEmailExpiry", country, state, zip,
                "pendingDeleteOtp", "pendingDeleteExpiry", username, "fullName"
                FROM "users" WHERE email = ${email.trim().toLowerCase()} LIMIT 1
            `;
        }
        throw error;
    }
};

export default router;
