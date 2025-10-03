import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class AuthService {
  /**
   * Generates a JWT for a user.
   * @param {Object} user - User object containing id, email, role, etc.
   * @returns {string} Generated JWT
   * @throws {Error} If JWT_SECRET is not configured or user data is invalid
   */
  static generateJWT(user) {
    try {
      if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET is not configured');
      }
      if (!user || !user.id || typeof user.id !== 'string') {
        throw new Error('Invalid user data');
      }

      const payload = {
        userId: user.id,
        email: user.email,
        role: user.role || 'USER',
        loginMethod: 'google',
        emailVerified: user.emailVerified,
        phoneVerified: user.phoneVerified,
      };

      return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });
    } catch (error) {
      console.error('Error generating JWT:', error);
      throw error;
    }
  }

  /**
   * Verifies a JWT and returns its payload.
   * @param {string} token - JWT to verify
   * @returns {Object} Decoded JWT payload
   * @throws {Error} If token is invalid or verification fails
   */
  static verifyJWT(token) {
    try {
      if (!token || typeof token !== 'string') {
        throw new Error('Invalid token');
      }
      return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      console.error('Error verifying JWT:', error);
      throw error;
    }
  }

  /**
   * Checks if a user is fully verified and active.
   * @param {Object} user - User object with email, phoneNumber, emailVerified, phoneVerified, isActive
   * @returns {boolean} True if user is fully verified and active
   * @throws {Error} If user data is invalid
   */
  static isUserFullyVerified(user) {
    try {
      if (!user || typeof user !== 'object') {
        throw new Error('Invalid user data');
      }
      const emailNeedsVerification = user.email && !user.emailVerified;
      const phoneNeedsVerification = user.phoneNumber && !user.phoneVerified;
      return !emailNeedsVerification && !phoneNeedsVerification && user.isActive;
    } catch (error) {
      console.error('Error checking user verification:', error);
      throw error;
    }
  }

  /**
   * Retrieves a user's profile by ID.
   * @param {string} userId - The ID of the user
   * @returns {Promise<Object|null>} User profile data or null if not found
   * @throws {Error} If userId is invalid or database query fails
   */
  static async getUserProfile(userId) {
    try {
      // Validate userId is a non-empty string
      if (!userId || typeof userId !== 'string') {
        throw new Error('Invalid user ID');
      }

      // Check database connection
      if (!prisma) {
        throw new Error('Database connection not available');
      }

      return await prisma.user.findUnique({
        where: { id: userId }, // Use string userId
        select: {
          id: true,
          email: true,
          name: true,
          phoneNumber: true,
          emailVerified: true,
          phoneVerified: true,
          isProfileComplete: true,
          role: true,
          isActive: true,
        },
      });
    } catch (error) {
      console.error('Error fetching user profile:', error);
      throw error;
    }
  }

  /**
   * Returns cookie options for JWT storage.
   * @param {boolean} isProduction - Whether the environment is production
   * @returns {Object} Cookie options
   * @throws {Error} If isProduction is invalid
   */
  static getCookieOptions(isProduction) {
    try {
      if (typeof isProduction !== 'boolean') {
        throw new Error('Invalid isProduction value');
      }
      return {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      };
    } catch (error) {
      console.error('Error generating cookie options:', error);
      throw error;
    }
  }
}