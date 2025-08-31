<<<<<<< HEAD
import { PrismaClient } from '@prisma/client';
import { randomBytes, createHash } from 'crypto';
=======
>>>>>>> 4514553022ee06b04ad61bcc3d78204d58d6043c
import bcrypt from 'bcryptjs';
import { ValidationError, NotFoundError } from '../utils/errors.js';
import logger from '../logger.js';

const prisma = new PrismaClient();


// --- Constants ---
const OTP_EXPIRATION_MINUTES = 10;
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
 * Generates a secure 6-digit OTP
 */
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * UNIFIED FORGOT PASSWORD SERVICE (supports both email and phone)
 */
export const forgotPasswordService = async (identifier, type = 'email') => {
  const result = await prisma.$transaction(async (tx) => {
<<<<<<< HEAD
    const user = await tx.user.findUnique({ where: { email: email.trim().toLowerCase() } });
=======
    let user;
    
    if (type === 'email') {
      user = await tx.user.findUnique({ where: { email: identifier } });
    } else if (type === 'phone') {
      user = await tx.user.findUnique({ where: { phoneNumber: identifier } });
    }
>>>>>>> 4514553022ee06b04ad61bcc3d78204d58d6043c

    if (!user) {
      return null;
    }

    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + OTP_EXPIRATION_MINUTES * 60 * 1000);

    await tx.user.update({
      where: { id: user.id },
      data: {
        resetToken: otp,
        resetTokenExpiry: otpExpiry,
      },
    });

<<<<<<< HEAD
    // Return the necessary data for sending the email.
    return { email: user.email, token, userName: user.name || 'User' };
=======
    return { 
      email: user.email, 
      phoneNumber: user.phoneNumber,
      otp, 
      userName: user.name || 'User',
      userId: user.id
    };
>>>>>>> 4514553022ee06b04ad61bcc3d78204d58d6043c
  });

  return result;
};

/**
 * EMAIL-SPECIFIC FORGOT PASSWORD SERVICE (backward compatibility)
 */
export const forgotPasswordServiceEmail = async (email) => {
  return await forgotPasswordService(email, 'email');
};

/**
 * PHONE-SPECIFIC FORGOT PASSWORD SERVICE (new)
 */
export const forgotPasswordServicePhone = async (phoneNumber) => {
  return await forgotPasswordService(phoneNumber, 'phone');
};

/**
 * UNIFIED VERIFY OTP SERVICE (supports both email and phone)
 */
export const verifyOTP = async (identifier, otp, type = 'email') => {
  if (!identifier || !otp) {
    return false;
  }

  let whereClause;
  
  if (type === 'email') {
    whereClause = {
      email: identifier,
      resetToken: otp,
      resetTokenExpiry: { gte: new Date() },
    };
  } else if (type === 'phone') {
    whereClause = {
      phoneNumber: identifier,
      resetToken: otp,
      resetTokenExpiry: { gte: new Date() },
    };
  }

  const user = await prisma.user.findFirst({
    where: whereClause,
  });

  return !!user;
};

/**
 * EMAIL-SPECIFIC VERIFY OTP (backward compatibility)
 */
export const verifyEmailOTP = async (email, otp) => {
  return await verifyOTP(email, otp, 'email');
};

/**
 * PHONE-SPECIFIC VERIFY OTP (new)
 */
export const verifyPhoneOTP = async (phoneNumber, otp) => {
  return await verifyOTP(phoneNumber, otp, 'phone');
};

/**
 * VERIFY OTP BY USER ID (for existing phone OTP pattern compatibility)
 */
export const verifyPhoneOTPForUser = async (userId, otp) => {
  if (!userId || !otp) {
    return false;
  }

  const user = await prisma.user.findFirst({
    where: {
      id: userId,
      resetToken: otp,
      resetTokenExpiry: { gte: new Date() },
    },
  });

  return !!user;
};

/**
 * UNIFIED CLEAR OTP SERVICE (supports both email and phone)
 */
export const clearOTP = async (identifier, type = 'email') => {
  let whereClause;
  
  if (type === 'email') {
    whereClause = { email: identifier };
  } else if (type === 'phone') {
    whereClause = { phoneNumber: identifier };
  }

  await prisma.user.updateMany({
    where: whereClause,
    data: {
      resetToken: null,
      resetTokenExpiry: null,
    },
  });
};

/**
 * EMAIL-SPECIFIC CLEAR OTP (backward compatibility)
 */
export const clearEmailOTP = async (email) => {
  return await clearOTP(email, 'email');
};

/**
 * PHONE-SPECIFIC CLEAR OTP (new)
 */
export const clearPhoneOTP = async (phoneNumber) => {
  return await clearOTP(phoneNumber, 'phone');
};

/**
 * CLEAR OTP BY USER ID (for existing phone OTP pattern compatibility)
 */
export const clearPhoneOTPByUserId = async (userId) => {
  await prisma.user.update({
    where: { id: userId },
    data: {
      resetToken: null,
      resetTokenExpiry: null,
    },
  });
};

/**
 * UNIFIED RESET PASSWORD SERVICE (supports both email and phone)
 */
export const resetPasswordService = async (identifier, newPassword, type = 'email') => {
  if (!identifier || !newPassword) {
    throw new ValidationError('Identifier and new password are required.');
  }
  if (newPassword.length < 8) {
    throw new ValidationError('Password must be at least 8 characters long.');
  }

  let whereClause;
  
  if (type === 'email') {
    whereClause = { email: identifier };
  } else if (type === 'phone') {
    whereClause = { phoneNumber: identifier };
  }

  const user = await prisma.user.findUnique({
    where: whereClause,
  });

  if (!user) {
    throw new NotFoundError('User not found.');
  }

  const hashedPassword = await bcrypt.hash(newPassword, BCRYPT_SALT_ROUNDS);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashedPassword,
      resetToken: null,
      resetTokenExpiry: null,
    },
  });

<<<<<<< HEAD
  logger.info('Password reset successful', { userId: user.id, email: user.email });
  return true; // Indicate success
=======
  return true;
};

/**
 * EMAIL-SPECIFIC RESET PASSWORD (backward compatibility)
 */
export const resetPasswordServiceEmail = async (email, newPassword) => {
  return await resetPasswordService(email, newPassword, 'email');
};

/**
 * PHONE-SPECIFIC RESET PASSWORD (new)
 */
export const resetPasswordServicePhone = async (phoneNumber, newPassword) => {
  return await resetPasswordService(phoneNumber, newPassword, 'phone');
};

/**
 * RESET PASSWORD BY USER ID (for existing phone OTP pattern compatibility)
 */
export const resetPasswordByUserId = async (userId, newPassword) => {
  if (!userId || !newPassword) {
    throw new ValidationError('User ID and new password are required.');
  }
  if (newPassword.length < 8) {
    throw new ValidationError('Password must be at least 8 characters long.');
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new NotFoundError('User not found.');
  }

  const hashedPassword = await bcrypt.hash(newPassword, BCRYPT_SALT_ROUNDS);

  await prisma.user.update({
    where: { id: userId },
    data: {
      password: hashedPassword,
      resetToken: null,
      resetTokenExpiry: null,
    },
  });

  return true;
};

/**
 * STORE OTP SERVICE (using existing resetToken field)
 * Compatible with both email and phone flows
 */
export const storeOTP = async (userId, otp, expirationMinutes = OTP_EXPIRATION_MINUTES) => {
  const otpExpiry = new Date(Date.now() + expirationMinutes * 60 * 1000);
  
  await prisma.user.update({
    where: { id: userId },
    data: {
      resetToken: otp,
      resetTokenExpiry: otpExpiry,
    },
  });
};

/**
 * STORE PHONE OTP (for registration compatibility)
 * This uses the same resetToken field but follows the registration pattern
 */
export const storePhoneOTP = async (userId, otp) => {
  return await storeOTP(userId, otp);
};

/**
 * FIND USER BY EMAIL (helper function)
 */
export const findUserByEmail = async (email) => {
  return await prisma.user.findUnique({
    where: { email }
  });
};

/**
 * FIND USER BY PHONE (helper function)
 */
export const findUserByPhone = async (phoneNumber) => {
  return await prisma.user.findUnique({
    where: { phoneNumber }
  });
>>>>>>> 4514553022ee06b04ad61bcc3d78204d58d6043c
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
