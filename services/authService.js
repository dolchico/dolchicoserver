import { PrismaClient } from '@prisma/client';
import { randomBytes, createHash } from 'crypto';
import bcrypt from 'bcryptjs';
import { ValidationError, NotFoundError } from '../utils/errors.js';
import logger from '../logger.js';

const prisma = new PrismaClient();

// --- Constants (Best practice: move to a config file) ---
const RESET_TOKEN_EXPIRATION_MINUTES = 60;
const BCRYPT_SALT_ROUNDS = 10;

// ============= OAuth USER MANAGEMENT =============

// Find account by provider + providerAccountId
export async function findAccount(provider, providerAccountId) {
  return prisma.account.findUnique({
    where: {
      provider_providerAccountId: {
        provider,
        providerAccountId,
      }
    }
  });
}

// Find user by id
export async function findUserById(id) {
  return prisma.user.findUnique({ 
    where: { id: Number(id) },
    select: {
      id: true,
      email: true,
      name: true,
      firstName: true,
      lastName: true,
      avatar: true,
      role: true,
      emailVerified: true,
      phoneVerified: true,
      phoneNumber: true,
      isActive: true,
      googleId: true,
      facebookId: true,
      createdAt: true,
      lastLoginAt: true
    }
  });
}

// Find user by email
export async function findUserByEmail(email) {
  return prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
}

// Find user by Facebook ID
export async function findUserByFacebookId(facebookId) {
  return prisma.user.findUnique({ where: { facebookId } });
}

// Find user by Google ID
export async function findUserByGoogleId(googleId) {
  return prisma.user.findUnique({ where: { googleId } });
}

// Create a new user
export async function createUser({ email, name, emailVerified }) {
  return prisma.user.create({
    data: {
      email: email.trim().toLowerCase(),
      name: name || '',
      emailVerified: !!emailVerified,
      isActive: true
    }
  });
}

// Create user with Facebook data
export async function createUserWithFacebook({ email, name, facebookId, avatar, firstName, lastName }) {
  return prisma.user.create({
    data: {
      email: email.trim().toLowerCase(),
      name: name || '',
      facebookId,
      avatar,
      firstName,
      lastName,
      emailVerified: true,
      isActive: true,
      lastLoginAt: new Date()
    }
  });
}

// Create user with Google data
export async function createUserWithGoogle({ email, name, googleId, avatar, firstName, lastName }) {
  return prisma.user.create({
    data: {
      email: email.trim().toLowerCase(),
      name: name || '',
      googleId,
      avatar,
      firstName,
      lastName,
      emailVerified: true,
      isActive: true,
      lastLoginAt: new Date()
    }
  });
}

// Update user with Facebook ID (for linking existing account)
export async function linkFacebookToUser(userId, facebookId, avatar, firstName, lastName) {
  return prisma.user.update({
    where: { id: Number(userId) },
    data: {
      facebookId,
      avatar: avatar || undefined,
      firstName: firstName || undefined,
      lastName: lastName || undefined,
      emailVerified: true,
      lastLoginAt: new Date()
    }
  });
}

// Update user with Google ID (for linking existing account)
export async function linkGoogleToUser(userId, googleId, avatar, firstName, lastName) {
  return prisma.user.update({
    where: { id: Number(userId) },
    data: {
      googleId,
      avatar: avatar || undefined,
      firstName: firstName || undefined,
      lastName: lastName || undefined,
      emailVerified: true,
      lastLoginAt: new Date()
    }
  });
}

// Update user last login
export async function updateUserLastLogin(userId) {
  return prisma.user.update({
    where: { id: Number(userId) },
    data: {
      lastLoginAt: new Date()
    }
  });
}

// Update user profile
export async function updateUserProfile(userId, updateData) {
  try {
    return await prisma.user.update({
      where: { id: Number(userId) },
      data: {
        ...updateData,
        updatedAt: new Date()
      },
      select: {
        id: true,
        email: true,
        name: true,
        firstName: true,
        lastName: true,
        avatar: true,
        phoneNumber: true,
        emailVerified: true,
        phoneVerified: true,
        updatedAt: true
      }
    });
  } catch (error) {
    logger.error('Update user profile error:', error);
    throw error;
  }
}

// Delete user data (for compliance)
export async function deleteUserData(userId, provider = null) {
  try {
    return await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: Number(userId) }
      });

      if (!user) {
        throw new NotFoundError('User not found');
      }

      // Delete related data
      await tx.cartItem.deleteMany({ where: { userId: Number(userId) } });
      await tx.emailVerificationToken.deleteMany({ where: { userId: Number(userId) } });
      await tx.phoneOTP.deleteMany({ where: { userId: Number(userId) } });
      await tx.emailOTP.deleteMany({ where: { userId: Number(userId) } });
      await tx.account.deleteMany({ where: { userId: Number(userId) } });
      await tx.session.deleteMany({ where: { userId: Number(userId) } });

      // For orders, you might want to anonymize rather than delete
      await tx.order.updateMany({
        where: { userId: Number(userId) },
        data: {
          // Anonymize order data instead of deleting
          address: { anonymized: true }
        }
      });

      // Delete user
      await tx.user.delete({
        where: { id: Number(userId) }
      });

      // Log deletion for compliance
      logger.info('User data deleted:', {
        userId,
        provider,
        timestamp: new Date().toISOString()
      });

      return true;
    });
  } catch (error) {
    logger.error('Delete user data error:', error);
    throw error;
  }
}

// Link account to user (for Account table)
export async function linkAccountToUser({ provider, providerAccountId, userId }) {
  return prisma.account.create({
    data: {
      provider,
      providerAccountId,
      userId: Number(userId)
    }
  });
}

// Find or create Facebook user with session linking support
export async function findOrCreateFacebookUser(profile, linkingUserId = null) {
  try {
    const { id: facebookId, emails, name, photos } = profile;
    const email = emails && emails[0] ? emails[0].value.trim().toLowerCase() : null;
    
    if (!email) {
      throw new Error('Email is required from Facebook profile');
    }

    // If linking to existing user
    if (linkingUserId) {
      const existingUser = await findUserById(linkingUserId);
      if (existingUser) {
        return await linkFacebookToUser(
          existingUser.id,
          facebookId,
          photos && photos[0] ? photos[0].value : null,
          name.givenName || '',
          name.familyName || ''
        );
      }
    }

    // Check if user exists with Facebook ID
    let user = await findUserByFacebookId(facebookId);
    
    if (user) {
      return await updateUserLastLogin(user.id);
    }

    // Check if user exists with same email (account linking)
    user = await findUserByEmail(email);
    
    if (user) {
      return await linkFacebookToUser(
        user.id, 
        facebookId, 
        photos && photos[0] ? photos[0].value : null,
        name.givenName || '',
        name.familyName || ''
      );
    }

    // Create new user
    return await createUserWithFacebook({
      email,
      name: `${name.givenName || ''} ${name.familyName || ''}`.trim(),
      facebookId,
      avatar: photos && photos[0] ? photos[0].value : null,
      firstName: name.givenName || '',
      lastName: name.familyName || ''
    });
  } catch (error) {
    logger.error('Facebook OAuth Error:', error);
    throw new Error('Failed to authenticate with Facebook');
  }
}

// Find or create Google user with session linking support
export async function findOrCreateGoogleUser(profile, linkingUserId = null) {
  try {
    const { id: googleId, emails, name, photos } = profile;
    const email = emails && emails[0] ? emails[0].value.trim().toLowerCase() : null;
    
    if (!email) {
      throw new Error('Email is required from Google profile');
    }

    // If linking to existing user
    if (linkingUserId) {
      const existingUser = await findUserById(linkingUserId);
      if (existingUser) {
        return await linkGoogleToUser(
          existingUser.id,
          googleId,
          photos && photos[0] ? photos[0].value : null,
          name.givenName || '',
          name.familyName || ''
        );
      }
    }

    // Check if user exists with Google ID
    let user = await findUserByGoogleId(googleId);
    
    if (user) {
      return await updateUserLastLogin(user.id);
    }

    // Check if user exists with same email (account linking)
    user = await findUserByEmail(email);
    
    if (user) {
      return await linkGoogleToUser(
        user.id, 
        googleId, 
        photos && photos[0] ? photos[0].value : null,
        name.givenName || '',
        name.familyName || ''
      );
    }

    // Create new user
    return await createUserWithGoogle({
      email,
      name: profile.displayName || `${name.givenName || ''} ${name.familyName || ''}`.trim(),
      googleId,
      avatar: photos && photos[0] ? photos[0].value : null,
      firstName: name.givenName || '',
      lastName: name.familyName || ''
    });
  } catch (error) {
    logger.error('Google OAuth Error:', error);
    throw new Error('Failed to authenticate with Google');
  }
}

// Get user's linked accounts
export async function getUserLinkedAccounts(userId) {
  const user = await prisma.user.findUnique({
    where: { id: Number(userId) },
    select: {
      googleId: true,
      facebookId: true,
      password: true
    }
  });

  if (!user) {
    throw new NotFoundError('User not found');
  }

  return {
    google: !!user.googleId,
    facebook: !!user.facebookId,
    email: !!user.password
  };
}

// Unlink OAuth provider
export async function unlinkOAuthProvider(userId, provider) {
  const updateData = {};
  
  if (provider === 'google') {
    updateData.googleId = null;
  } else if (provider === 'facebook') {
    updateData.facebookId = null;
  } else {
    throw new ValidationError('Invalid provider');
  }

  // Check if user has other auth methods before unlinking
  const user = await prisma.user.findUnique({
    where: { id: Number(userId) },
    select: {
      password: true,
      googleId: true,
      facebookId: true
    }
  });

  if (!user) {
    throw new NotFoundError('User not found');
  }

  const hasPassword = !!user.password;
  const hasOtherOAuth = provider === 'google' ? !!user.facebookId : !!user.googleId;

  if (!hasPassword && !hasOtherOAuth) {
    throw new ValidationError('Cannot unlink the only authentication method');
  }

  return await prisma.$transaction(async (tx) => {
    // Update user
    const updatedUser = await tx.user.update({
      where: { id: Number(userId) },
      data: updateData
    });

    // Remove from accounts table if exists
    await tx.account.deleteMany({
      where: {
        userId: Number(userId),
        provider: provider
      }
    });

    return updatedUser;
  });
}

// ============= PASSWORD RESET FUNCTIONALITY =============

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
    const user = await tx.user.findUnique({ where: { email: email.trim().toLowerCase() } });

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
    return { email: user.email, token, userName: user.name || 'User' };
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

  logger.info('Password reset successful', { userId: user.id, email: user.email });
  return true; // Indicate success
};

// ============= UTILITY FUNCTIONS =============

// Check if user exists and is active
export async function checkUserStatus(userId) {
  const user = await prisma.user.findUnique({
    where: { id: Number(userId) },
    select: {
      isActive: true,
      emailVerified: true
    }
  });

  return user;
}

// Get user statistics (for admin)
export async function getUserStats() {
  const stats = await prisma.$transaction([
    prisma.user.count(),
    prisma.user.count({ where: { isActive: true } }),
    prisma.user.count({ where: { emailVerified: true } }),
    prisma.user.count({ where: { googleId: { not: null } } }),
    prisma.user.count({ where: { facebookId: { not: null } } }),
  ]);

  return {
    total: stats[0],
    active: stats[1],
    emailVerified: stats[2],
    googleUsers: stats[3],
    facebookUsers: stats[4]
  };
}

export default prisma;
