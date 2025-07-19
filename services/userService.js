import prisma from '../lib/prisma.js';
import { createEmailVerificationToken } from './tokenService.js'; // Import the token service
import { sendVerificationEmail } from './mailService.js'; // Import the mail service

// Create a new user with normalized email and phone number
export const createUser = async (userData) => {
  if (userData.email) {
    userData.email = userData.email.trim().toLowerCase();
  }
  if (userData.phoneNumber) {
    userData.phoneNumber = userData.phoneNumber.trim();
  }

  return prisma.user.create({ data: userData });
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

// Update user profile with allowed fields
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
      where: { id: Number(userId) },
      data
    });
  } catch (err) {
    if (err.code === 'P2002') {
      throw new Error('Email or phone number already exists.');
    }
    throw err;
  }
};

// === NEW: Resend Email Verification Service ===
/**
 * Resends an email verification token to a user.
 * This service handles the complete business logic of:
 * 1. Finding the user by email (normalized)
 * 2. Checking if they're already verified
 * 3. Cleaning up old tokens (ensures only one active token)
 * 4. Creating a new token
 * 5. Sending the verification email
 * 
 * @param {string} email - The user's email address
 * @returns {Promise<{success: boolean, userFound: boolean, alreadyVerified: boolean}>}
 */
export const resendEmailVerificationService = async (email) => {
  // Normalize the email using the same pattern as other functions
  const cleanEmail = email.trim().toLowerCase();
  
  // Find the user by email using the existing service function
  const user = await findUserByEmail(cleanEmail);

  // If user doesn't exist, return status object (don't throw error for security)
  // This allows the controller to send a generic response to prevent email enumeration
  if (!user) {
    return {
      success: false,
      userFound: false,
      alreadyVerified: false
    };
  }

  // If user is already verified, return appropriate status
  if (user.emailVerified) {
    return {
      success: false,
      userFound: true,
      alreadyVerified: true
    };
  }

  try {
    // Use a transaction to ensure atomicity:
    // Delete old tokens and create/send new one as a single operation
    await prisma.$transaction(async (tx) => {
      // Step 1: Delete any existing verification tokens for this user
      // This ensures only one active token exists at a time, preventing confusion
      await tx.emailVerificationToken.deleteMany({
        where: { userId: user.id }
      });

      // Step 2: Create a new verification token using the existing token service
      const newToken = await createEmailVerificationToken(user.id);

      // Step 3: Send the verification email using the existing mail service
      await sendVerificationEmail(user.email, user.name, newToken);
    });

    return {
      success: true,
      userFound: true,
      alreadyVerified: false
    };

  } catch (error) {
    console.error('Error in resendEmailVerificationService:', error);
    throw error; // Let the controller handle the error response
  }
};
