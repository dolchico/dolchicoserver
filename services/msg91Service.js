import axios from 'axios';
import prisma from '../lib/prisma.js';

// MSG91 Configuration
const MSG91_CONFIG = {
  authkey: process.env.MSG91_AUTH_KEY,
  template_id: process.env.MSG91_WHATSAPP_TEMPLATE_ID,
  whatsapp_number: process.env.MSG91_WHATSAPP_NUMBER,
  apiUrl: 'https://control.msg91.com/api/v5'
};

// ================================
// WHATSAPP OTP FUNCTIONS
// ================================

/**
 * Send WhatsApp OTP using MSG91 API
 * @param {string} phoneNumber - Phone number in +91XXXXXXXXXX format
 * @param {string} otpCode - 6-digit OTP code
 * @returns {Promise<{success: boolean, messageId?: string}>}
 */
export const sendWhatsAppOTP = async (phoneNumber, otpCode) => {
  try {
    // Prepare the request payload for MSG91 WhatsApp API
    const payload = {
      integrated_number: MSG91_CONFIG.whatsapp_number,
      content_type: "template",
      payload: {
        messaging_product: "whatsapp",
        type: "template",
        template: {
          name: MSG91_CONFIG.template_id,
          language: { code: "en" },
          components: [{
            type: "body",
            parameters: [{ 
              type: "text", 
              text: otpCode 
            }]
          }]
        }
      },
      recipients: [{
        recipient: phoneNumber.replace('+', ''),
        recipient_type: "individual"
      }]
    };

    console.log('Sending WhatsApp OTP via MSG91:', { phoneNumber, template: MSG91_CONFIG.template_id });

    const response = await axios.post(
      `${MSG91_CONFIG.apiUrl}/whatsapp/whatsapp-outbound-message/bulk/`,
      payload,
      {
        headers: {
          'authkey': MSG91_CONFIG.authkey,
          'Content-Type': 'application/json'
        },
        timeout: 10000 // 10 second timeout
      }
    );

    // Check if the response indicates success
    if (response.data && response.data.type === 'success') {
      console.log('WhatsApp OTP sent successfully:', response.data);
      return { 
        success: true, 
        messageId: response.data.message_id || response.data.request_id 
      };
    } else {
      console.error('MSG91 API returned error:', response.data);
      throw new Error(`MSG91 API Error: ${response.data.message || 'Unknown error'}`);
    }

  } catch (error) {
    console.error('MSG91 WhatsApp OTP Error:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });

    // Handle specific errors
    if (error.response?.status === 401) {
      throw new Error('MSG91 authentication failed. Check your API key.');
    } else if (error.response?.status === 429) {
      throw new Error('Rate limit exceeded. Please try again later.');
    } else if (error.code === 'ECONNABORTED') {
      throw new Error('Request timeout. Please try again.');
    }

    throw new Error('Failed to send WhatsApp OTP');
  }
};

// ================================
// OTP DATABASE OPERATIONS
// ================================

/**
 * Generate 6-digit OTP and store in database
 * @param {number} userId - User ID
 * @param {string} otpType - 'SIGNIN' or 'SIGNUP'
 * @param {string} ipAddress - Client IP address
 * @param {string} userAgent - Client user agent
 * @returns {Promise<string>} Generated OTP code
 */
export const generateAndStoreOTP = async (userId, otpType, ipAddress, userAgent) => {
  try {
    // Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    console.log('Generating OTP for user:', { userId, otpType });

    // Store OTP in database using transaction for consistency
    await prisma.$transaction(async (tx) => {
      // Delete any existing unused OTPs for this user to prevent multiple active OTPs
      await tx.phoneOTP.deleteMany({
        where: {
          userId: userId,
          isUsed: false
        }
      });

      // Create new OTP record
      await tx.phoneOTP.create({
        data: {
          userId: userId,
          otp: otpCode,
          type: otpType,
          ipAddress: ipAddress || 'unknown',
          userAgent: userAgent || 'unknown',
          expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes from now
          isUsed: false,
          attempts: 0
        }
      });
    });

    console.log('OTP stored successfully for user:', userId);
    return otpCode;

  } catch (error) {
    console.error('Error generating and storing OTP:', error);
    throw new Error('Failed to generate OTP');
  }
};

/**
 * Verify OTP from database
 * @param {string} phoneNumber - Phone number
 * @param {string} otpCode - OTP code to verify
 * @returns {Promise<{user: object, otpType: string}>}
 */
export const verifyOTP = async (phoneNumber, otpCode) => {
  try {
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
        role: true
      }
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Find valid OTP
    const validOTP = await prisma.phoneOTP.findFirst({
      where: {
        userId: user.id,
        otp: otpCode,
        isUsed: false,
        expiresAt: { gt: new Date() }
      }
    });

    if (!validOTP) {
      // Increment failed attempts for security
      await incrementFailedOTPAttempts(user.id);
      throw new Error('Invalid or expired OTP');
    }

    // Mark OTP as used in a transaction
    await prisma.$transaction(async (tx) => {
      await tx.phoneOTP.update({
        where: { id: validOTP.id },
        data: { 
          isUsed: true,
          attempts: validOTP.attempts + 1
        }
      });

      // Reset failed attempts on successful verification
      await tx.user.update({
        where: { id: user.id },
        data: { 
          failedOtpAttempts: 0,
          phoneVerified: true,
          lastLoginAt: new Date()
        }
      });
    });

    console.log('OTP verified successfully for user:', user.id);
    
    return { 
      user: {
        ...user,
        phoneVerified: true
      }, 
      otpType: validOTP.type 
    };

  } catch (error) {
    console.error('Error verifying OTP:', error);
    throw error;
  }
};

// ================================
// SECURITY HELPER FUNCTIONS
// ================================

/**
 * Increment failed OTP attempts for security
 * @param {number} userId - User ID
 */
const incrementFailedOTPAttempts = async (userId) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { failedOtpAttempts: true }
    });

    const newFailedAttempts = (user?.failedOtpAttempts || 0) + 1;
    const updateData = { failedOtpAttempts: newFailedAttempts };

    // Lock account if too many failed attempts (optional security measure)
    if (newFailedAttempts >= 5) {
      updateData.lockedUntil = new Date(Date.now() + 30 * 60 * 1000); // Lock for 30 minutes
      console.log('User account locked due to failed OTP attempts:', userId);
    }

    await prisma.user.update({
      where: { id: userId },
      data: updateData
    });

  } catch (error) {
    console.error('Error incrementing failed OTP attempts:', error);
    // Don't throw error here as it's a security feature, not critical for main flow
  }
};

/**
 * Check if user account is locked
 * @param {number} userId - User ID
 * @returns {Promise<boolean>}
 */
export const isUserLocked = async (userId) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { lockedUntil: true }
    });

    if (user?.lockedUntil && user.lockedUntil > new Date()) {
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error checking user lock status:', error);
    return false;
  }
};

// ================================
// RATE LIMITING HELPERS
// ================================

/**
 * Check rate limiting for OTP requests
 * @param {string} phoneNumber - Phone number
 * @param {number} maxRequests - Maximum requests allowed
 * @param {number} timeWindowMinutes - Time window in minutes
 * @returns {Promise<{allowed: boolean, remainingTime?: number}>}
 */
export const checkOTPRateLimit = async (phoneNumber, maxRequests = 3, timeWindowMinutes = 60) => {
  try {
    const timeWindow = new Date(Date.now() - timeWindowMinutes * 60 * 1000);
    
    const user = await prisma.user.findUnique({
      where: { phoneNumber: phoneNumber.trim() }
    });

    if (!user) {
      return { allowed: true };
    }

    const recentOTPs = await prisma.phoneOTP.count({
      where: {
        userId: user.id,
        createdAt: { gte: timeWindow }
      }
    });

    if (recentOTPs >= maxRequests) {
      const oldestOTP = await prisma.phoneOTP.findFirst({
        where: {
          userId: user.id,
          createdAt: { gte: timeWindow }
        },
        orderBy: { createdAt: 'asc' }
      });

      const remainingTime = oldestOTP 
        ? Math.ceil((oldestOTP.createdAt.getTime() + timeWindowMinutes * 60 * 1000 - Date.now()) / 1000)
        : 0;

      return { allowed: false, remainingTime };
    }

    return { allowed: true };

  } catch (error) {
    console.error('Error checking OTP rate limit:', error);
    return { allowed: true }; // Allow on error to prevent blocking legitimate users
  }
};

// ================================
// UTILITY FUNCTIONS
// ================================

/**
 * Clean up expired OTPs (run this periodically)
 */
export const cleanupExpiredOTPs = async () => {
  try {
    const result = await prisma.phoneOTP.deleteMany({
      where: {
        expiresAt: { lt: new Date() }
      }
    });

    console.log(`Cleaned up ${result.count} expired OTPs`);
    return result.count;

  } catch (error) {
    console.error('Error cleaning up expired OTPs:', error);
    throw error;
  }
};

/**
 * Get OTP statistics for monitoring
 */
export const getOTPStats = async (phoneNumber) => {
  try {
    const user = await prisma.user.findUnique({
      where: { phoneNumber: phoneNumber.trim() }
    });

    if (!user) {
      return null;
    }

    const stats = await prisma.phoneOTP.groupBy({
      by: ['type'],
      where: {
        userId: user.id,
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
      },
      _count: true
    });

    return stats;

  } catch (error) {
    console.error('Error getting OTP stats:', error);
    return null;
  }
};
