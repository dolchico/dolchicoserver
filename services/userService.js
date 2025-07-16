import prisma from '../lib/prisma.js';

// Create a new user with normalized email and phone number
export const createUser = async (userData) => {
  if (userData.email) {
    userData.email = userData.email.trim().toLowerCase();
  }
  if (userData.phoneNumber) {
    userData.phoneNumber = userData.phoneNumber.trim();
  }

  return prisma.user.create({ data: userData }); // ✅ FIXED HERE
};


// Find user by email (always trimmed and lowercased)
export const findUserByEmail = async (email) => {
  if (!email) return null;
  return prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() }
  });
};

// Find user by phone number (trimmed)
export const findUserByPhone = async (phoneNumber) => {
  if (!phoneNumber) return null;
  return prisma.user.findUnique({
    where: { phoneNumber: phoneNumber.trim() }
  });
};

// Find user by ID
export const findUserById = async (id) => {
  if (!id) return null;
  return prisma.user.findUnique({ where: { id } });
};

// Update user's emailVerified status
export const verifyUserEmail = async (userId) => {
  if (!userId) throw new Error('userId is required');
  try {
    return await prisma.user.update({
      where: { id: userId },
      data: { emailVerified: true },
    });
  } catch (error) {
    console.error('Error verifying user email:', error);
    throw error;
  }
};

// Update user's phoneVerified status
export const verifyUserPhone = async (userId) => {
  if (!userId) throw new Error('userId is required');
  try {
    return await prisma.user.update({
      where: { id: userId },
      data: { phoneVerified: true },
    });
  } catch (error) {
    console.error('Error verifying user phone:', error);
    throw error;
  }
};
export const updateProfile = async (userId, updateData) => {
  // Allow these fields to be updated:
  const allowedFields = ['name', 'email', 'phoneNumber', 'emailVerified', 'phoneVerified'];
  const data = {};
  for (const field of allowedFields) {
    if (updateData[field] !== undefined) data[field] = updateData[field];
  }
  // Normalize inputs
  if (data.email) data.email = data.email.trim().toLowerCase();
  if (data.phoneNumber) data.phoneNumber = data.phoneNumber.trim();

  if (Object.keys(data).length === 0) {
    throw new Error('No fields provided for update.');
  }

  try {
    return await prisma.user.update({
      where: { id: Number(userId) }, // Remove Number() if using string IDs
      data
    });
  } catch (err) {
    if (err.code === 'P2002') {
      throw new Error('Email or phone number already exists.');
    }
    throw err;
  }
};
