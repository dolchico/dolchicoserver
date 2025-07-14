import prisma from '../lib/prisma.js';

// Create a new user
export const createUser = async (userData) => {
  return await prisma.user.create({ data: userData });
};

// Find user by email
export const findUserByEmail = async (email) => {
  return await prisma.user.findUnique({ where: { email } });
};

// Find user by phone number
export const findUserByPhone = async (phoneNumber) => {
  return await prisma.user.findUnique({ where: { phoneNumber } });
};

// Update user's emailVerified status
export const verifyUserEmail = async (userId) => {
  return await prisma.user.update({
    where: { id: userId },
    data: { emailVerified: true },
  });
};

// Update user's phoneVerified status
export const verifyUserPhone = async (userId) => {
  return await prisma.user.update({
    where: { id: userId },
    data: { phoneVerified: true },
  });
};
