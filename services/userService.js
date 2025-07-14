import prisma from '../lib/prisma.js';

// Create a new user
// Create a new user
export const createUser = async (userData) => {
  // Normalize email to lowercase if present
  if (userData.email) {
    userData.email = userData.email.toLowerCase();
  }
  return await prisma.user.create({ data: userData });
};


// Find user by email (case-insensitive)
export const findUserByEmail = async (email) => {
  return await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
};

// Find user by phone number
export const findUserByPhone = async (phoneNumber) => {
  return await prisma.user.findUnique({ where: { phoneNumber } });
};

// Find user by ID (optional utility)
export const findUserById = async (id) => {
  return await prisma.user.findUnique({ where: { id } });
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
