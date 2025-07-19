import { randomBytes, createHash } from 'crypto';
import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma.js';
import { ValidationError, NotFoundError } from '../utils/errors.js';

// --- Constants (Best practice: move to a config file) ---
const RESET_TOKEN_EXPIRATION_MINUTES = 60;
const BCRYPT_SALT_ROUNDS = 10;

/**
 * Generates a secure token pair: a plain token for the user and a hashed token for the database.
 * @returns {{ token: string, hashedToken: string }}
 */
const generateResetToken = () => {
  const token = randomBytes(32).toString('hex');
  const hashedToken = createHash('sha256').update(token).digest('hex');
  return { token, hashedToken };
};

/**
 * FORGOT PASSWORD SERVICE
 * Finds a user, generates a reset token, and saves its hashed version to the database.
 * Uses a transaction to ensure atomicity.
 * @param {string} email - The user's email address.
 * @returns {Promise<{email: string, token: string, userName: string} | null>}
 */
export const forgotPasswordService = async (email) => {
  // Use a transaction to ensure we only update the token if the user exists.
  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { email } });

    // IMPORTANT: To prevent email enumeration attacks, we don't throw an error here.
    // We simply return null, and the controller will handle sending a generic response.
    if (!user) {
      return null;
    }

    const { token, hashedToken } = generateResetToken();
    const resetTokenExpiry = new Date(Date.now() + RESET_TOKEN_EXPIRATION_MINUTES * 60 * 1000);

    await tx.user.update({
      where: { id: user.id },
      data: {
        resetToken: hashedToken,
        resetTokenExpiry,
      },
    });

    // Return the necessary data for sending the email.
    return { email: user.email, token, userName: user.name }; // Assumes user model has 'name'
  });

  return result;
};

/**
 * RESET PASSWORD SERVICE
 * Verifies a reset token, and if valid, updates the user's password.
 * @param {string} token - The plain reset token from the user.
 * @param {string} newPassword - The new password.
 * @returns {Promise<boolean>} - True on success.
 */
export const resetPasswordService = async (token, newPassword) => {
  // 1. Validate inputs
  if (!token || !newPassword) {
    throw new ValidationError('Token and new password are required.');
  }
  if (newPassword.length < 8) {
    throw new ValidationError('Password must be at least 8 characters long.');
  }

  // 2. Hash the incoming token to find it in the database
  const hashedToken = createHash('sha256').update(token).digest('hex');

  // 3. Find the user and verify the token is not expired
  const user = await prisma.user.findFirst({
    where: {
      resetToken: hashedToken,
      resetTokenExpiry: { gte: new Date() }, // Check that token expiry is greater than or equal to now
    },
  });

  if (!user) {
    throw new NotFoundError('This token is invalid or has expired. Please request a new one.');
  }

  // 4. Hash the new password and update the user record
  const hashedPassword = await bcrypt.hash(newPassword, BCRYPT_SALT_ROUNDS);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashedPassword,
      resetToken: null,       // Crucial: Invalidate the token after use
      resetTokenExpiry: null,
    },
  });

  return true; // Indicate success
};
