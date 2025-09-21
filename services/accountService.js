// services/accountService.js
import prisma from '../lib/prisma.js';
import { sendOTPEmail } from './mailService.js';
import { sendOTP } from './smsService.js';
import validator from 'validator';

/**
 * Sends OTP to user's registered email and/or phone for account deletion
 */
export const sendAccountDeletionOtp = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: Number(userId) }
  });

  if (!user) throw new Error('User not found');
  
  // Check if user has either email or phone number
  if (!user.email && !user.phoneNumber) {
    throw new Error('A registered email or phone number is required for OTP');
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiryTime = new Date(Date.now() + 5 * 60 * 1000);

  // Clear any existing OTPs for ACCOUNT_DELETE type
  if (user.email) {
    await prisma.emailOTP.deleteMany({
      where: { userId: Number(userId), type: 'ACCOUNT_DELETE' }
    });
  }
  
  if (user.phoneNumber) {
    await prisma.phoneOTP.deleteMany({
      where: { userId: Number(userId), type: 'ACCOUNT_DELETE' }
    });
  }

  const otpPromises = [];
  const sentTo = [];

  // Store OTP in emailOTP table if email exists
  if (user.email) {
    otpPromises.push(
      prisma.emailOTP.create({
        data: {
          userId: Number(userId),
          otp,
          expiresAt: expiryTime,
          type: 'ACCOUNT_DELETE',
          attempts: 0,
          isUsed: false,
          maxAttempts: 3
        }
      })
    );
    
    // Send email OTP
    otpPromises.push(sendOTPEmail(user.email, user.name || 'User', otp, 'Account Deletion'));
    sentTo.push('email');
  }

  // Store OTP in phoneOTP table if phone exists
  if (user.phoneNumber) {
    otpPromises.push(
      prisma.phoneOTP.create({
        data: {
          userId: Number(userId),
          otp,
          expiresAt: expiryTime,
          type: 'ACCOUNT_DELETE',
          attempts: 0,
          isUsed: false,
          maxAttempts: 3
        }
      })
    );
    
    // Send SMS OTP with custom message for account deletion
    otpPromises.push(sendOTP(user.phoneNumber, otp, 'account-deletion'));
    sentTo.push('phone');
  }

  // Store in User for tracking
  otpPromises.push(
    prisma.user.update({
      where: { id: Number(userId) },
      data: {
        pendingDeleteOtp: otp,
        pendingDeleteExpiry: expiryTime
      }
    })
  );

  await Promise.all(otpPromises);

  const contactMethods = sentTo.join(' and ');
  return { 
    success: true,
    message: `OTP sent to registered ${contactMethods} for account deletion verification`,
    sentTo: sentTo
  };
};

/**
 * Verifies the provided OTP and deletes user account
 */
export const verifyAndDeleteAccount = async (userId, otp) => {
  if (!otp) throw new Error('OTP is required');
  if (!validator.isLength(otp.trim(), { min: 6, max: 6 }) || !validator.isNumeric(otp.trim())) {
    throw new Error('Invalid OTP format');
  }

  // Check for OTP in both email and phone OTP tables
  const [emailOtpRecord, phoneOtpRecord] = await Promise.all([
    prisma.emailOTP.findFirst({
      where: {
        userId: Number(userId),
        otp: otp.trim(),
        type: 'ACCOUNT_DELETE',
        expiresAt: { gt: new Date() },
        isUsed: false
      }
    }),
    prisma.phoneOTP.findFirst({
      where: {
        userId: Number(userId),
        otp: otp.trim(),
        type: 'ACCOUNT_DELETE',
        expiresAt: { gt: new Date() },
        isUsed: false
      }
    })
  ]);

  const otpRecord = emailOtpRecord || phoneOtpRecord;
  if (!otpRecord) throw new Error('Invalid or expired OTP');

  // Mark the OTP as used
  if (emailOtpRecord) {
    await prisma.emailOTP.update({
      where: { id: emailOtpRecord.id },
      data: { isUsed: true }
    });
  }
  
  if (phoneOtpRecord) {
    await prisma.phoneOTP.update({
      where: { id: phoneOtpRecord.id },
      data: { isUsed: true }
    });
  }

  const user = await prisma.user.findUnique({ where: { id: Number(userId) } });
  if (!user) throw new Error('User not found');

  // Verify against user's stored OTP as additional security
  if (
    !user.pendingDeleteOtp || 
    user.pendingDeleteOtp !== otp.trim() ||
    !user.pendingDeleteExpiry ||
    user.pendingDeleteExpiry < new Date()
  ) {
    throw new Error('Invalid or expired deletion request');
  }

  // Delete all related records and the user account
  await prisma.$transaction([
    // Clean up OTP records
    prisma.emailOTP.deleteMany({ where: { userId: Number(userId) } }),
    prisma.phoneOTP.deleteMany({ where: { userId: Number(userId) } }),
    // Delete the user (cascade will handle related records)
    prisma.user.delete({ where: { id: Number(userId) } })
  ]);

  return { 
    success: true,
    message: 'Account deleted successfully' 
  };
};
