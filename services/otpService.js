// services/otpService.js

import prisma from '../lib/prisma.js';

// ===============================
// PHONE OTP FLOW
// ===============================

/**
 * Generate a phone OTP for a user and store it (5 min).
 */
export const generatePhoneOTP = async (userId) => {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

  await prisma.phoneOTP.create({
    data: { otp, userId, expiresAt },
  });

  return otp;
};

/**
 * Verify a phone OTP: true if valid, not expired, one-time use.
 */
export const verifyPhoneOTP = async (userId, otp) => {
  const record = await prisma.phoneOTP.findFirst({
    where: { userId, otp, expiresAt: { gt: new Date() } },
  });

  if (!record) return false;

  await prisma.phoneOTP.delete({ where: { id: record.id } });
  return true;
};

/**
 * Delete all phone OTPs for a user (cleanup utility).
 */
export const deletePhoneOTPsForUser = async (userId) => {
  await prisma.phoneOTP.deleteMany({ where: { userId } });
};


// ===============================
// EMAIL OTP FLOW
// ===============================

/**
 * Generate an email OTP for a user and store it (5 min).
 */
export const generateEmailOTP = async (userId) => {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

  await prisma.emailOTP.create({
    data: { otp, userId, expiresAt },
  });

  return otp;
};

/**
 * Verify a user's email OTP.
 * @param {string} email
 * @param {string} otp
 * @returns {Promise<{ success: boolean, message: string }>}
 */
export const verifyEmailOtpService = async (email, otp) => {
  if (!email || !otp) {
    return { success: false, message: 'Email and OTP required.' };
  }

  // Find user by email
  const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (!user) {
    return { success: false, message: 'User not found.' };
  }

  // Find OTP that matches and is not expired
  const otpRecord = await prisma.emailOTP.findFirst({
    where: { userId: user.id, otp, expiresAt: { gt: new Date() } },
  });

  if (!otpRecord) {
    return { success: false, message: 'Invalid or expired OTP.' };
  }

  // Mark user as verified
  await prisma.user.update({ where: { id: user.id }, data: { emailVerified: true } });

  // Remove used OTP
  await prisma.emailOTP.delete({ where: { id: otpRecord.id } });

  return { success: true, message: 'Email verified successfully.' };
};

/**
 * Delete all email OTPs for a user (optional cleanup).
 */
export const deleteEmailOTPsForUser = async (userId) => {
  await prisma.emailOTP.deleteMany({ where: { userId } });
};
