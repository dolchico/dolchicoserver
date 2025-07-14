import prisma from '../lib/prisma.js';
import crypto from 'crypto';

// Generate and store a unique email verification token
export const createEmailVerificationToken = async (userId) => {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

  await prisma.emailVerificationToken.create({
    data: {
      token,
      userId,
      expiresAt,
    },
  });

  return token;
};
export const deleteEmailVerificationToken = async (token) => {
  return await prisma.emailVerificationToken.delete({
    where: { token },
  });
};
export const findEmailVerificationToken = async (token) => {
  return await prisma.emailVerificationToken.findUnique({
    where: { token },
  });
};