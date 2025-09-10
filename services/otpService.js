// otpService.js
import prisma from "../lib/prisma.js";

// ===============================
// PHONE OTP FLOW
// ===============================

/**
 * Store phone OTP for a user (replaces any existing OTPs)
 * @param {number} userId - User ID
 * @param {string} otp - OTP code
 * @returns {Promise<object>} Created OTP record
 */
export const storePhoneOTP = async (userId, otp) => {
    if (!userId || !otp) throw new Error("userId and otp are required");

    try {
        // Delete existing OTPs for this user
        await prisma.phoneOTP.deleteMany({
            where: { userId: Number(userId) },
        });

        // Create new OTP with 10-minute expiration
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

        return await prisma.phoneOTP.create({
            data: {
                userId: Number(userId),
                otp: otp.toString(),
                expiresAt,
                type: "SIGNUP", // or 'SIGNIN' depending on your enum
                attempts: 0,
                isUsed: false,
            },
        });
    } catch (error) {
        console.error("Error storing phone OTP:", error);
        throw error;
    }
};

/**
 * Verify phone OTP for a user
 * @param {number} userId - User ID
 * @param {string} otp - OTP code to verify
 * @returns {Promise<boolean>} True if OTP is valid
 */
export const verifyPhoneOtpService = async (userId, otp) => {
    if (!userId || !otp) return false;

    try {
        const otpRecord = await prisma.phoneOTP.findFirst({
            where: {
                userId: Number(userId),
                otp: otp.toString(),
                isUsed: false,
            },
        });

        if (!otpRecord) {
            return false;
        }

        // Check if OTP has expired
        if (new Date() > otpRecord.expiresAt) {
            // Clean up expired OTP
            await prisma.phoneOTP.delete({ where: { id: otpRecord.id } });
            return false;
        }

        // Mark OTP as used and delete it
        await prisma.phoneOTP.delete({ where: { id: otpRecord.id } });
        return true;
    } catch (error) {
        console.error("Error verifying phone OTP:", error);
        return false;
    }
};

/**
 * Alternative phone OTP verification (your original function)
 * @param {number} userId - User ID
 * @param {string} otp - OTP code
 * @returns {Promise<boolean>} True if valid
 */
export const verifyPhoneOTP = async (userId, otp) => {
    try {
        const record = await prisma.phoneOTP.findFirst({
            where: {
                userId: Number(userId),
                otp: otp.toString(),
                expiresAt: { gt: new Date() },
                isUsed: false,
            },
        });

        if (!record) return false;

        await prisma.phoneOTP.delete({ where: { id: record.id } });
        return true;
    } catch (error) {
        console.error("Error in verifyPhoneOTP:", error);
        return false;
    }
};

/**
 * Cleanup all phone OTPs for a user
 * @param {number} userId - User ID
 */
export const deletePhoneOTPsForUser = async (userId) => {
    try {
        await prisma.phoneOTP.deleteMany({
            where: { userId: Number(userId) },
        });
    } catch (error) {
        console.error("Error deleting phone OTPs:", error);
        throw error;
    }
};

// ===============================
// EMAIL OTP FLOW
// ===============================

/**
 * Store email OTP for a user
 * @param {number} userId - User ID
 * @param {string} otp - OTP code
 * @returns {Promise<object>} Created OTP record
 */
export const storeEmailOTP = async (
    userId,
    otp,
    type = "EMAIL_VERIFICATION"
) => {
    if (!userId || !otp) throw new Error("userId and otp are required");

    try {
        await prisma.emailOTP.deleteMany({ where: { userId: Number(userId) } });
        const expiresAt = new Date(Date.now() + 20 * 60 * 1000);

        return await prisma.emailOTP.create({
            data: {
                otp: otp.toString().slice(0, 6), // <- Guard against long OTPs
                userId: Number(userId),
                expiresAt,
                type,
                attempts: 0,
                isUsed: false,
                maxAttempts: 3, // Add if you use this field
            },
        });
    } catch (error) {
        console.error("Error storing email OTP:", error);
        throw error;
    }
};

/**
 * Verify email OTP using email address
 * @param {string} email - User email
 * @param {string} otp - OTP code
 * @returns {Promise<object>} Verification result
 */
export const verifyEmailOtpService = async (email, otp) => {
    if (!email || !otp) {
        return { success: false, message: "Email and OTP required." };
    }

    try {
        const user = await prisma.user.findUnique({
            where: { email: email.trim().toLowerCase() },
        });

        if (!user) {
            return { success: false, message: "User not found." };
        }

        const otpRecord = await prisma.emailOTP.findFirst({
            where: {
                userId: user.id,
                otp: otp.toString(),
                expiresAt: { gt: new Date() },
                isUsed: false,
            },
        });

        if (!otpRecord) {
            return { success: false, message: "Invalid or expired OTP." };
        }

        // Mark email as verified and delete OTP
        await prisma.user.update({
            where: { id: user.id },
            data: { emailVerified: true },
        });

        await prisma.emailOTP.delete({ where: { id: otpRecord.id } });

        return { success: true, message: "Email verified successfully." };
    } catch (error) {
        console.error("Error verifying email OTP:", error);
        return { success: false, message: "Verification failed." };
    }
};

/**
 * Verify email OTP using userId
 * @param {number} userId - User ID
 * @param {string} otp - OTP code
 * @returns {Promise<boolean>} True if valid
 */
export const verifyEmailOTPByUserId = async (userId, otp) => {
    try {
        const otpRecord = await prisma.emailOTP.findFirst({
            where: {
                userId: Number(userId),
                otp: otp.toString(),
                expiresAt: { gt: new Date() },
                isUsed: false,
                type: "EMAIL_CHANGE",
            },
        });

        if (!otpRecord) return false;

        // Mark as used instead of deleting to prevent race conditions
        await prisma.emailOTP.update({
            where: { id: otpRecord.id },
            data: { isUsed: true },
        });
        return true;
    } catch (error) {
        console.error("Error verifying email OTP by userId:", error);
        return false;
    }
};

/**
 * Cleanup all email OTPs for a user
 * @param {number} userId - User ID
 */
export const deleteEmailOTPsForUser = async (userId) => {
    try {
        await prisma.emailOTP.deleteMany({
            where: { userId: Number(userId) },
        });
    } catch (error) {
        console.error("Error deleting email OTPs:", error);
        throw error;
    }
};

// ===============================
// CLEANUP AND UTILITY FUNCTIONS
// ===============================

/**
 * Cleanup expired OTPs (for scheduled cleanup jobs)
 */
export const cleanupExpiredOTPs = async () => {
    try {
        const now = new Date();

        const deletedPhoneOTPs = await prisma.phoneOTP.deleteMany({
            where: { expiresAt: { lt: now } },
        });

        const deletedEmailOTPs = await prisma.emailOTP.deleteMany({
            where: { expiresAt: { lt: now } },
        });

        console.log(
            `Cleaned up ${deletedPhoneOTPs.count} phone OTPs and ${deletedEmailOTPs.count} email OTPs`
        );

        return {
            phoneOTPs: deletedPhoneOTPs.count,
            emailOTPs: deletedEmailOTPs.count,
        };
    } catch (error) {
        console.error("Error cleaning up expired OTPs:", error);
        throw error;
    }
};

/**
 * Get OTP statistics for monitoring
 * @param {number} userId - Optional user ID filter
 */
export const getOTPStats = async (userId = null) => {
    try {
        const whereClause = userId ? { userId: Number(userId) } : {};

        const phoneOTPCount = await prisma.phoneOTP.count({
            where: whereClause,
        });
        const emailOTPCount = await prisma.emailOTP.count({
            where: whereClause,
        });

        return {
            phoneOTPs: phoneOTPCount,
            emailOTPs: emailOTPCount,
            total: phoneOTPCount + emailOTPCount,
        };
    } catch (error) {
        console.error("Error getting OTP stats:", error);
        throw error;
    }
};
