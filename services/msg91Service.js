import axios from 'axios';
import prisma from '../lib/prisma.js';

// MSG91 Configuration
const MSG91_CONFIG = {
  authkey: process.env.MSG91_AUTH_KEY,
  template_id: process.env.MSG91_WHATSAPP_TEMPLATE_ID,
  whatsapp_number: process.env.MSG91_WHATSAPP_NUMBER,
  apiUrl: 'https://control.msg91.com/api/v5',
};

// Validate MSG91 environment variables at startup
const requiredEnvVars = ['MSG91_AUTH_KEY', 'MSG91_WHATSAPP_TEMPLATE_ID', 'MSG91_WHATSAPP_NUMBER'];
const missingEnvVars = requiredEnvVars.filter((key) => !process.env[key]);
if (missingEnvVars.length > 0) {
  throw new Error(`Missing MSG91 environment variables: ${missingEnvVars.join(', ')}`);
}

// ================================
// WHATSAPP OTP FUNCTIONS
// ================================

/**
 * Sends WhatsApp OTP using MSG91 API.
 * @param {string} phoneNumber - Phone number in +91XXXXXXXXXX format
 * @param {string} otpCode - 6-digit OTP code
 * @returns {Promise<{success: boolean, messageId?: string}>}
 * @throws {Error} If inputs are invalid or API call fails
 */
export const sendWhatsAppOTP = async (phoneNumber, otpCode) => {
  try {
    // Validate inputs
    if (!phoneNumber || typeof phoneNumber !== 'string' || !/^\+\d{10,12}$/.test(phoneNumber)) {
      throw new Error('Invalid phone number: must be in E.164 format (e.g., +91XXXXXXXXXX)');
    }
    if (!otpCode || typeof otpCode !== 'string' || !/^\d{6}$/.test(otpCode)) {
      throw new Error('Invalid OTP code: must be a 6-digit string');
    }

    // Prepare the request payload for MSG91 WhatsApp API
    const payload = {
      integrated_number: MSG91_CONFIG.whatsapp_number,
      content_type: 'template',
      payload: {
        messaging_product: 'whatsapp',
        type: 'template',
        template: {
          name: MSG91_CONFIG.template_id,
          language: { code: 'en' },
          components: [
            {
              type: 'body',
              parameters: [{ type: 'text', text: otpCode }],
            },
          ],
        },
      },
      recipients: [
        {
          recipient: phoneNumber.replace('+', ''),
          recipient_type: 'individual',
        },
      ],
    };

    console.log('Sending WhatsApp OTP via MSG91:', { phoneNumber, template: MSG91_CONFIG.template_id });

    const response = await axios.post(
      `${MSG91_CONFIG.apiUrl}/whatsapp/whatsapp-outbound-message/bulk/`,
      payload,
      {
        headers: {
          'authkey': MSG91_CONFIG.authkey,
          'Content-Type': 'application/json',
        },
        timeout: 10000, // 10 second timeout
      }
    );

    // Check if the response indicates success
    if (response.data && response.data.type === 'success') {
      console.log('WhatsApp OTP sent successfully:', response.data);
      return {
        success: true,
        messageId: response.data.message_id || response.data.request_id,
      };
    } else {
      console.error('MSG91 API returned error:', response.data);
      throw new Error(`MSG91 API Error: ${response.data.message || 'Unknown error'}`);
    }
  } catch (error) {
    console.error('MSG91 WhatsApp OTP Error:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
    });

    // Handle specific errors
    if (error.response?.status === 401) {
      throw new Error('MSG91 authentication failed. Check your API key.');
    } else if (error.response?.status === 429) {
      throw new Error('Rate limit exceeded. Please try again later.');
    } else if (error.code === 'ECONNABORTED') {
      throw new Error('Request timeout. Please try again.');
    }

    throw new Error(`Failed to send WhatsApp OTP: ${error.message}`);
  }
};

// ================================
// OTP DATABASE OPERATIONS
// ================================

/**
 * Generates a 6-digit OTP and stores it in the database.
 * @param {string} userId - User ID (UUID)
 * @param {string} otpType - 'SIGNIN' or 'SIGNUP'
 * @param {string} ipAddress - Client IP address
 * @param {string} userAgent - Client user agent
 * @returns {Promise<string>} Generated OTP code
 * @throws {Error} If inputs are invalid or database operation fails
 */
export const generateAndStoreOTP = async (userId, otpType, ipAddress, userAgent) => {
  try {
    // Validate inputs
    if (!userId || typeof userId !== 'string') {
      throw new Error('Invalid user ID: must be a string');
    }
    if (!['SIGNIN', 'SIGNUP'].includes(otpType)) {
      throw new Error('Invalid OTP type: must be SIGNIN or SIGNUP');
    }
    if (ipAddress && typeof ipAddress !== 'string') {
      throw new Error('Invalid IP address: must be a string');
    }
    if (userAgent && typeof userAgent !== 'string') {
      throw new Error('Invalid user agent: must be a string');
    }

    // Check database connection
    if (!prisma) {
      throw new Error('Database connection not available');
    }

    // Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    console.log('Generating OTP for user:', { userId, otpType });

    // Store OTP in database using transaction
    await prisma.$transaction(async (tx) => {
      // Delete any existing unused OTPs for this user
      await tx.phoneOTP.deleteMany({
        where: {
          userId, // Use string userId
          isUsed: false,
        },
      });

      // Create new OTP record
      await tx.phoneOTP.create({
        data: {
          userId, // Use string userId
          otp: otpCode,
          type: otpType,
          ipAddress: ipAddress || 'unknown',
          userAgent: userAgent || 'unknown',
          expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
          isUsed: false,
          attempts: 0,
        },
      });
    });

    console.log('OTP stored successfully for user:', userId);
    return otpCode;
  } catch (error) {
    console.error('Error generating and storing OTP:', error);
    throw new Error(`Failed to generate OTP: ${error.message}`);
  }
};

/**
 * Verifies an OTP from the database.
 * @param {string} phoneNumber - Phone number
 * @param {string} otpCode - OTP code to verify
 * @returns {Promise<{user: object, otpType: string}>}
 * @throws {Error} If inputs are invalid or verification fails
 */
export const verifyOTP = async (phoneNumber, otpCode) => {
  try {
    // Validate inputs
    if (!phoneNumber || typeof phoneNumber !== 'string' || !/^\+\d{10,12}$/.test(phoneNumber)) {
      throw new Error('Invalid phone number: must be in E.164 format (e.g., +91XXXXXXXXXX)');
    }
    if (!otpCode || typeof otpCode !== 'string' || !/^\d{6}$/.test(otpCode)) {
      throw new Error('Invalid OTP code: must be a 6-digit string');
    }

    // Check database connection
    if (!prisma) {
      throw new Error('Database connection not available');
    }

    const cleanPhone = phoneNumber.trim();

    console.log('Verifying OTP for phone:', cleanPhone);

    // Find user by phone number
    const user = await prisma.user.findUnique({
      where: { phoneNumber: cleanPhone },
      select: {
        id: true,
        phoneNumber: true,
        name: true,
        email: true,
        phoneVerified: true,
        isProfileComplete: true,
        role: true,
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Find valid OTP
    const validOTP = await prisma.phoneOTP.findFirst({
      where: {
        userId: user.id, // Use string userId
        otp: otpCode,
        isUsed: false,
        expiresAt: { gt: new Date() },
      },
    });

    if (!validOTP) {
      // Increment failed attempts
      await incrementFailedOTPAttempts(user.id);
      throw new Error('Invalid or expired OTP');
    }

    // Mark OTP as used in a transaction
    await prisma.$transaction(async (tx) => {
      await tx.phoneOTP.update({
        where: { id: validOTP.id },
        data: {
          isUsed: true,
          attempts: validOTP.attempts + 1,
        },
      });

      // Reset failed attempts and update user
      await tx.user.update({
        where: { id: user.id }, // Use string userId
        data: {
          failedOtpAttempts: 0,
          phoneVerified: true,
          lastLoginAt: new Date(),
        },
      });
    });

    console.log('OTP verified successfully for user:', user.id);

    return {
      user: {
        ...user,
        phoneVerified: true,
      },
      otpType: validOTP.type,
    };
  } catch (error) {
    console.error('Error verifying OTP:', error);
    throw new Error(`Failed to verify OTP: ${error.message}`);
  }
};

// ================================
// SECURITY HELPER FUNCTIONS
// ================================

/**
 * Increments failed OTP attempts for security.
 * @param {string} userId - User ID (UUID)
 * @returns {Promise<void>}
 * @throws {Error} If database operation fails
 */
const incrementFailedOTPAttempts = async (userId) => {
  try {
    // Validate input
    if (!userId || typeof userId !== 'string') {
      throw new Error('Invalid user ID: must be a string');
    }

    // Check database connection
    if (!prisma) {
      throw new Error('Database connection not available');
    }

    const user = await prisma.user.findUnique({
      where: { id: userId }, // Use string userId
      select: { failedOtpAttempts: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const newFailedAttempts = (user.failedOtpAttempts || 0) + 1;
    const updateData = { failedOtpAttempts: newFailedAttempts };

    // Lock account if too many failed attempts
    if (newFailedAttempts >= 5) {
      updateData.lockedUntil = new Date(Date.now() + 30 * 60 * 1000); // Lock for 30 minutes
      console.log('User account locked due to failed OTP attempts:', userId);
    }

    await prisma.user.update({
      where: { id: userId }, // Use string userId
      data: updateData,
    });
  } catch (error) {
    console.error('Error incrementing failed OTP attempts:', error);
    // Don't throw error to avoid disrupting main flow
  }
};

/**
 * Checks if a user account is locked.
 * @param {string} userId - User ID (UUID)
 * @returns {Promise<boolean>}
 * @throws {Error} If database operation fails
 */
export const isUserLocked = async (userId) => {
  try {
    // Validate input
    if (!userId || typeof userId !== 'string') {
      throw new Error('Invalid user ID: must be a string');
    }

    // Check database connection
    if (!prisma) {
      throw new Error('Database connection not available');
    }

    const user = await prisma.user.findUnique({
      where: { id: userId }, // Use string userId
      select: { lockedUntil: true },
    });

    if (user?.lockedUntil && user.lockedUntil > new Date()) {
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error checking user lock status:', error);
    return false; // Default to unlocked on error
  }
};

// ================================
// RATE LIMITING HELPERS
// ================================

/**
 * Checks rate limiting for OTP requests.
 * @param {string} phoneNumber - Phone number
 * @param {number} maxRequests - Maximum requests allowed
 * @param {number} timeWindowMinutes - Time window in minutes
 * @returns {Promise<{allowed: boolean, remainingTime?: number}>}
 * @throws {Error} If inputs are invalid or database operation fails
 */
export const checkOTPRateLimit = async (phoneNumber, maxRequests = 3, timeWindowMinutes = 60) => {
  try {
    // Validate inputs
    if (!phoneNumber || typeof phoneNumber !== 'string' || !/^\+\d{10,12}$/.test(phoneNumber)) {
      throw new Error('Invalid phone number: must be in E.164 format (e.g., +91XXXXXXXXXX)');
    }
    if (!Number.isInteger(maxRequests) || maxRequests <= 0) {
      throw new Error('Invalid maxRequests: must be a positive integer');
    }
    if (!Number.isInteger(timeWindowMinutes) || timeWindowMinutes <= 0) {
      throw new Error('Invalid timeWindowMinutes: must be a positive integer');
    }

    // Check database connection
    if (!prisma) {
      throw new Error('Database connection not available');
    }

    const timeWindow = new Date(Date.now() - timeWindowMinutes * 60 * 1000);
    const cleanPhone = phoneNumber.trim();

    const user = await prisma.user.findUnique({
      where: { phoneNumber: cleanPhone },
    });

    if (!user) {
      return { allowed: true };
    }

    const recentOTPs = await prisma.phoneOTP.count({
      where: {
        userId: user.id, // Use string userId
        createdAt: { gte: timeWindow },
      },
    });

    if (recentOTPs >= maxRequests) {
      const oldestOTP = await prisma.phoneOTP.findFirst({
        where: {
          userId: user.id, // Use string userId
          createdAt: { gte: timeWindow },
        },
        orderBy: { createdAt: 'asc' },
      });

      const remainingTime = oldestOTP
        ? Math.ceil((oldestOTP.createdAt.getTime() + timeWindowMinutes * 60 * 1000 - Date.now()) / 1000)
        : 0;

      return { allowed: false, remainingTime };
    }

    return { allowed: true };
  } catch (error) {
    console.error('Error checking OTP rate limit:', error);
    return { allowed: true }; // Allow on error to avoid blocking legitimate users
  }
};

// ================================
// UTILITY FUNCTIONS
// ================================

/**
 * Cleans up expired OTPs.
 * @returns {Promise<number>} Number of deleted OTPs
 * @throws {Error} If database operation fails
 */
export const cleanupExpiredOTPs = async () => {
  try {
    // Check database connection
    if (!prisma) {
      throw new Error('Database connection not available');
    }

    const result = await prisma.phoneOTP.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });

    console.log(`Cleaned up ${result.count} expired OTPs`);
    return result.count;
  } catch (error) {
    console.error('Error cleaning up expired OTPs:', error);
    throw new Error(`Failed to clean up expired OTPs: ${error.message}`);
  }
};

/**
 * Gets OTP statistics for monitoring.
 * @param {string} phoneNumber - Phone number
 * @returns {Promise<Object|null>} OTP statistics or null if user not found
 * @throws {Error} If input is invalid or database operation fails
 */
export const getOTPStats = async (phoneNumber) => {
  try {
    // Validate input
    if (!phoneNumber || typeof phoneNumber !== 'string' || !/^\+\d{10,12}$/.test(phoneNumber)) {
      throw new Error('Invalid phone number: must be in E.164 format (e.g., +91XXXXXXXXXX)');
    }

    // Check database connection
    if (!prisma) {
      throw new Error('Database connection not available');
    }

    const cleanPhone = phoneNumber.trim();
    const user = await prisma.user.findUnique({
      where: { phoneNumber: cleanPhone },
    });

    if (!user) {
      return null;
    }

    const stats = await prisma.phoneOTP.groupBy({
      by: ['type'],
      where: {
        userId: user.id, // Use string userId
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // Last 24 hours
      },
      _count: true,
    });

    return stats;
  } catch (error) {
    console.error('Error getting OTP stats:', error);
    throw new Error(`Failed to get OTP stats: ${error.message}`);
  }
};