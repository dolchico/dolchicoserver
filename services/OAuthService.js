import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class AuthService {
  static generateJWT(user) {
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is not configured');
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
  }

  static verifyJWT(token) {
    return jwt.verify(token, process.env.JWT_SECRET);
  }

  static isUserFullyVerified(user) {
    // Check if user needs any verification
    const emailNeedsVerification = user.email && !user.emailVerified;
    const phoneNeedsVerification = user.phoneNumber && !user.phoneVerified;
    
    return !emailNeedsVerification && !phoneNeedsVerification && user.isActive;
  }

  static async getUserProfile(userId) {
    return await prisma.user.findUnique({
      where: { id: Number(userId) },
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
  }

  static getCookieOptions(isProduction) {
    return {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    };
  }
}
