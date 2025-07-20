// services/otpService.js

import prisma from '../lib/prisma.js';

// ===============================
// PHONE OTP FLOW (no OTP generation here!)
// ===============================

/**
 * Store a phone OTP for a user (5 min expiry).
 * @param {number} userId
 * @param {string} otp
 */
export const storePhoneOTP = async (userId, otp) => {
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
  await prisma.phoneOTP.create({ data: { otp, userId, expiresAt } });
};

/**
 * Verify a phone OTP (one-time, not expired).
 * @returns {Promise<boolean>}
 */
export const verifyPhoneOTP = async (userId, otp) => {
  const record = await prisma.phoneOTP.findFirst({
    where: { userId, otp, expiresAt: { gt: new Date() } }
  });
  if (!record) return false;
  await prisma.phoneOTP.delete({ where: { id: record.id } });
  return true;
};

/**
 * Cleanup all phone OTPs for a user.
 */
export const deletePhoneOTPsForUser = async (userId) => {
  await prisma.phoneOTP.deleteMany({ where: { userId } });
};


// ===============================
// EMAIL OTP FLOW (no OTP generation here!)
// ===============================

/**
 * Store an email OTP for a user (5 min expiry).
 * @param {number} userId
 * @param {string} otp
 */
export const storeEmailOTP = async (userId, otp) => {
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
  await prisma.emailOTP.create({ data: { otp, userId, expiresAt } });
};

/**
 * Verify a user's email OTP (one-time, not expired).
 * @returns {Promise<{ success: boolean, message: string }>}
 */
export const verifyEmailOtpService = async (email, otp) => {
  if (!email || !otp) return { success: false, message: 'Email and OTP required.' };
  const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (!user) return { success: false, message: 'User not found.' };

  const otpRecord = await prisma.emailOTP.findFirst({
    where: { userId: user.id, otp, expiresAt: { gt: new Date() } }
  });
  if (!otpRecord) return { success: false, message: 'Invalid or expired OTP.' };

  await prisma.user.update({ where: { id: user.id }, data: { emailVerified: true } });
  await prisma.emailOTP.delete({ where: { id: otpRecord.id } });
  return { success: true, message: 'Email verified successfully.' };
};

/**
 * Cleanup all email OTPs for a user.
 */
export const deleteEmailOTPsForUser = async (userId) => {
  await prisma.emailOTP.deleteMany({ where: { userId } });
};
