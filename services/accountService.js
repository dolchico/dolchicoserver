// services/accountService.js
import prisma from '../lib/prisma.js';
import { sendOTPEmail } from './mailService.js';
import validator from 'validator';

/**
 * Sends OTP to user's registered email for account deletion
 */
export const sendAccountDeletionOtp = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: Number(userId) }
  });

  if (!user) throw new Error('User not found');
  if (!user.email) throw new Error('A registered email is required for OTP');

  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  // Clear any existing OTPs for ACCOUNT_DELETE type
  await prisma.emailOTP.deleteMany({
    where: { userId: Number(userId), type: 'ACCOUNT_DELETE' }
  });

  // Store OTP in emailOTP table
  await prisma.emailOTP.create({
    data: {
      userId: Number(userId),
      otp,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      type: 'ACCOUNT_DELETE',
      attempts: 0,
      isUsed: false,
      maxAttempts: 3
    }
  });

  // Store in User for tracking
  await prisma.user.update({
    where: { id: Number(userId) },
    data: {
      pendingDeleteOtp: otp,
      pendingDeleteExpiry: new Date(Date.now() + 5 * 60 * 1000)
    }
  });

  // Send OTP
  await sendOTPEmail(user.email, otp, 'Account Deletion');
  return { message: 'OTP sent to registered email for account deletion verification' };
};

/**
 * Verifies the provided OTP and deletes user account
 */
export const verifyAndDeleteAccount = async (userId, otp) => {
  if (!otp) throw new Error('OTP is required');
  if (!validator.isLength(otp.trim(), { min: 6, max: 6 }) || !validator.isNumeric(otp.trim())) {
    throw new Error('Invalid OTP format');
  }

  const otpRecord = await prisma.emailOTP.findFirst({
    where: {
      userId: Number(userId),
      otp: otp.trim(),
      type: 'ACCOUNT_DELETE',
      expiresAt: { gt: new Date() },
      isUsed: false
    }
  });

  if (!otpRecord) throw new Error('Invalid or expired OTP');

  await prisma.emailOTP.update({
    where: { id: otpRecord.id },
    data: { isUsed: true }
  });

  const user = await prisma.user.findUnique({ where: { id: Number(userId) } });
  if (!user) throw new Error('User not found');

  if (
    !user.pendingDeleteOtp || 
    user.pendingDeleteOtp !== otp.trim() ||
    !user.pendingDeleteExpiry ||
    user.pendingDeleteExpiry < new Date()
  ) {
    throw new Error('Invalid or expired deletion request');
  }

  await prisma.user.delete({ where: { id: Number(userId) } });
  return { message: 'Account deleted successfully' };
};
