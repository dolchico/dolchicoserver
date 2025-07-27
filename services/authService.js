import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma.js';
import { ValidationError, NotFoundError } from '../utils/errors.js';


// --- Constants ---
const OTP_EXPIRATION_MINUTES = 10;
const BCRYPT_SALT_ROUNDS = 10;

/**
 * Generates a secure 6-digit OTP
 */
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * UNIFIED FORGOT PASSWORD SERVICE (supports both email and phone)
 */
export const forgotPasswordService = async (identifier, type = 'email') => {
  const result = await prisma.$transaction(async (tx) => {
    let user;
    
    if (type === 'email') {
      user = await tx.user.findUnique({ where: { email: identifier } });
    } else if (type === 'phone') {
      user = await tx.user.findUnique({ where: { phoneNumber: identifier } });
    }

    if (!user) {
      return null;
    }

    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + OTP_EXPIRATION_MINUTES * 60 * 1000);

    await tx.user.update({
      where: { id: user.id },
      data: {
        resetToken: otp,
        resetTokenExpiry: otpExpiry,
      },
    });

    return { 
      email: user.email, 
      phoneNumber: user.phoneNumber,
      otp, 
      userName: user.name || 'User',
      userId: user.id
    };
  });

  return result;
};

/**
 * EMAIL-SPECIFIC FORGOT PASSWORD SERVICE (backward compatibility)
 */
export const forgotPasswordServiceEmail = async (email) => {
  return await forgotPasswordService(email, 'email');
};

/**
 * PHONE-SPECIFIC FORGOT PASSWORD SERVICE (new)
 */
export const forgotPasswordServicePhone = async (phoneNumber) => {
  return await forgotPasswordService(phoneNumber, 'phone');
};

/**
 * UNIFIED VERIFY OTP SERVICE (supports both email and phone)
 */
export const verifyOTP = async (identifier, otp, type = 'email') => {
  if (!identifier || !otp) {
    return false;
  }

  let whereClause;
  
  if (type === 'email') {
    whereClause = {
      email: identifier,
      resetToken: otp,
      resetTokenExpiry: { gte: new Date() },
    };
  } else if (type === 'phone') {
    whereClause = {
      phoneNumber: identifier,
      resetToken: otp,
      resetTokenExpiry: { gte: new Date() },
    };
  }

  const user = await prisma.user.findFirst({
    where: whereClause,
  });

  return !!user;
};

/**
 * EMAIL-SPECIFIC VERIFY OTP (backward compatibility)
 */
export const verifyEmailOTP = async (email, otp) => {
  return await verifyOTP(email, otp, 'email');
};

/**
 * PHONE-SPECIFIC VERIFY OTP (new)
 */
export const verifyPhoneOTP = async (phoneNumber, otp) => {
  return await verifyOTP(phoneNumber, otp, 'phone');
};

/**
 * VERIFY OTP BY USER ID (for existing phone OTP pattern compatibility)
 */
export const verifyPhoneOTPForUser = async (userId, otp) => {
  if (!userId || !otp) {
    return false;
  }

  const user = await prisma.user.findFirst({
    where: {
      id: userId,
      resetToken: otp,
      resetTokenExpiry: { gte: new Date() },
    },
  });

  return !!user;
};

/**
 * UNIFIED CLEAR OTP SERVICE (supports both email and phone)
 */
export const clearOTP = async (identifier, type = 'email') => {
  let whereClause;
  
  if (type === 'email') {
    whereClause = { email: identifier };
  } else if (type === 'phone') {
    whereClause = { phoneNumber: identifier };
  }

  await prisma.user.updateMany({
    where: whereClause,
    data: {
      resetToken: null,
      resetTokenExpiry: null,
    },
  });
};

/**
 * EMAIL-SPECIFIC CLEAR OTP (backward compatibility)
 */
export const clearEmailOTP = async (email) => {
  return await clearOTP(email, 'email');
};

/**
 * PHONE-SPECIFIC CLEAR OTP (new)
 */
export const clearPhoneOTP = async (phoneNumber) => {
  return await clearOTP(phoneNumber, 'phone');
};

/**
 * CLEAR OTP BY USER ID (for existing phone OTP pattern compatibility)
 */
export const clearPhoneOTPByUserId = async (userId) => {
  await prisma.user.update({
    where: { id: userId },
    data: {
      resetToken: null,
      resetTokenExpiry: null,
    },
  });
};

/**
 * UNIFIED RESET PASSWORD SERVICE (supports both email and phone)
 */
export const resetPasswordService = async (identifier, newPassword, type = 'email') => {
  if (!identifier || !newPassword) {
    throw new ValidationError('Identifier and new password are required.');
  }
  if (newPassword.length < 8) {
    throw new ValidationError('Password must be at least 8 characters long.');
  }

  let whereClause;
  
  if (type === 'email') {
    whereClause = { email: identifier };
  } else if (type === 'phone') {
    whereClause = { phoneNumber: identifier };
  }

  const user = await prisma.user.findUnique({
    where: whereClause,
  });

  if (!user) {
    throw new NotFoundError('User not found.');
  }

  const hashedPassword = await bcrypt.hash(newPassword, BCRYPT_SALT_ROUNDS);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashedPassword,
      resetToken: null,
      resetTokenExpiry: null,
    },
  });

  return true;
};

/**
 * EMAIL-SPECIFIC RESET PASSWORD (backward compatibility)
 */
export const resetPasswordServiceEmail = async (email, newPassword) => {
  return await resetPasswordService(email, newPassword, 'email');
};

/**
 * PHONE-SPECIFIC RESET PASSWORD (new)
 */
export const resetPasswordServicePhone = async (phoneNumber, newPassword) => {
  return await resetPasswordService(phoneNumber, newPassword, 'phone');
};

/**
 * RESET PASSWORD BY USER ID (for existing phone OTP pattern compatibility)
 */
export const resetPasswordByUserId = async (userId, newPassword) => {
  if (!userId || !newPassword) {
    throw new ValidationError('User ID and new password are required.');
  }
  if (newPassword.length < 8) {
    throw new ValidationError('Password must be at least 8 characters long.');
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new NotFoundError('User not found.');
  }

  const hashedPassword = await bcrypt.hash(newPassword, BCRYPT_SALT_ROUNDS);

  await prisma.user.update({
    where: { id: userId },
    data: {
      password: hashedPassword,
      resetToken: null,
      resetTokenExpiry: null,
    },
  });

  return true;
};

/**
 * STORE OTP SERVICE (using existing resetToken field)
 * Compatible with both email and phone flows
 */
export const storeOTP = async (userId, otp, expirationMinutes = OTP_EXPIRATION_MINUTES) => {
  const otpExpiry = new Date(Date.now() + expirationMinutes * 60 * 1000);
  
  await prisma.user.update({
    where: { id: userId },
    data: {
      resetToken: otp,
      resetTokenExpiry: otpExpiry,
    },
  });
};

/**
 * STORE PHONE OTP (for registration compatibility)
 * This uses the same resetToken field but follows the registration pattern
 */
export const storePhoneOTP = async (userId, otp) => {
  return await storeOTP(userId, otp);
};

/**
 * FIND USER BY EMAIL (helper function)
 */
export const findUserByEmail = async (email) => {
  return await prisma.user.findUnique({
    where: { email }
  });
};

/**
 * FIND USER BY PHONE (helper function)
 */
export const findUserByPhone = async (phoneNumber) => {
  return await prisma.user.findUnique({
    where: { phoneNumber }
  });
};
