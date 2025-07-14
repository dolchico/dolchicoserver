// services/otpService.js

import prisma from '../lib/prisma.js';

// Generate and store a 6-digit OTP for a user (valid for 5 minutes)
export const generateOTP = async (userId) => {
  // Generate a random 6-digit OTP as a string
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now

  // Store the OTP in the database
  await prisma.phoneOTP.create({
    data: {
      otp,
      userId,
      expiresAt,
    },
  });

  return otp;
};

// Verify an OTP for a user (returns true if valid and not expired, false otherwise)
export const verifyOTP = async (userId, otp) => {
  const record = await prisma.phoneOTP.findFirst({
    where: {
      userId,
      otp,
      expiresAt: {
        gt: new Date(), // Only allow if not expired
      },
    },
  });

  if (!record) {
    return false;
  }

  // Delete the OTP after successful verification (one-time use)
  await prisma.phoneOTP.delete({ where: { id: record.id } });

  return true;
};

// Optional: Delete all OTPs for a user (e.g., after successful login or for cleanup)
export const deleteOTPsForUser = async (userId) => {
  await prisma.phoneOTP.deleteMany({ where: { userId } });
};
