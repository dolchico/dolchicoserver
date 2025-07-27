import prisma from '../lib/prisma.js';
import { createEmailVerificationToken } from './tokenService.js';
import { sendVerificationEmail } from './mailService.js';
import bcrypt from 'bcryptjs';
 

export const createUser = async (userData) => {
  try {
    const cleanUserData = { ...userData };
    
    if (cleanUserData.email) {
      cleanUserData.email = cleanUserData.email.trim().toLowerCase();
    }
    
    if (cleanUserData.phoneNumber) {
      cleanUserData.phoneNumber = cleanUserData.phoneNumber.trim();
    }

    // Create userDataWithDefaults with name included
    const userDataWithDefaults = {
      name: cleanUserData.name || null,
      email: cleanUserData.email || null,
      phoneNumber: cleanUserData.phoneNumber || null,
      password: cleanUserData.password || null,
      role: cleanUserData.role || 'USER',
      emailVerified: cleanUserData.emailVerified ?? false,
      phoneVerified: cleanUserData.phoneVerified ?? false,
      isProfileComplete: cleanUserData.isProfileComplete ?? false
    };

    const newUser = await prisma.user.create({ 
      data: userDataWithDefaults,
      select: {
        id: true,
        name: true,
        email: true,
        phoneNumber: true,
        emailVerified: true,
        phoneVerified: true,
        isActive: true,
        isProfileComplete: true,
        role: true,
        createdAt: true,
        updatedAt: true
      }
    });
    
    console.log('User created successfully:', {
      id: newUser.id,
      email: newUser.email,
      phoneNumber: newUser.phoneNumber
    });
    
    return newUser;
    
  } catch (error) {
    console.error('Error creating user:', error);
    
    if (error.code === 'P2002') {
      const field = error.meta?.target?.[0] || 'field';
      throw new Error(`${field === 'email' ? 'Email' : 'Phone number'} already exists`);
    }
    
    throw new Error('Failed to create user: ' + error.message);
  }
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
  return prisma.user.findUnique({ where: { id: Number(id) } });
};

// Update user's emailVerified status
export const verifyUserEmail = async (userId) => {
  if (!userId) throw new Error('userId is required');
  try {
    return await prisma.user.update({
      where: { id: Number(userId) },
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
      where: { id: Number(userId) },
      data: { phoneVerified: true },
    });
  } catch (error) {
    console.error('Error verifying user phone:', error);
    throw error;
  }
};

// Update user profile with allowed fields
export const updateProfile = async (userId, updateData) => {
  const allowedFields = ['name', 'email', 'phoneNumber', 'emailVerified', 'phoneVerified', 'isProfileComplete'];
  const data = {};
  
  for (const field of allowedFields) {
    if (updateData[field] !== undefined) data[field] = updateData[field];
  }
  
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

// Existing email verification service
export const resendEmailVerificationService = async (email) => {
  const cleanEmail = email.trim().toLowerCase();
  const user = await findUserByEmail(cleanEmail);

  if (!user) {
    return { success: false, userFound: false, alreadyVerified: false };
  }

  if (user.emailVerified) {
    return { success: false, userFound: true, alreadyVerified: true };
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.emailVerificationToken.deleteMany({
        where: { userId: user.id }
      });

      const newToken = await createEmailVerificationToken(user.id);
      await sendVerificationEmail(user.email, user.name || 'User', newToken);
    });

    return { success: true, userFound: true, alreadyVerified: false };

  } catch (error) {
    console.error('Error in resendEmailVerificationService:', error);
    throw error;
  }
};

// Auth flow determination
export const determineAuthFlow = async (phoneNumber) => {
  const cleanPhone = phoneNumber.trim();
  
  try {
    const user = await findUserByPhone(cleanPhone);
    
    if (!user) {
      return { flowType: 'signup', user: null };
    } else if (user.phoneVerified && user.isProfileComplete) {
      return { flowType: 'signin', user };
    } else {
      return { flowType: 'signup', user };
    }
  } catch (error) {
    console.error('Error determining auth flow:', error);
    throw new Error('Failed to determine authentication flow');
  }
};

// Find or create user (simplified)
export const findOrCreateUser = async (phoneNumber) => {
  const cleanPhone = phoneNumber.trim();
  
  try {
    let user = await findUserByPhone(cleanPhone);
    
    if (!user) {
      user = await createUser({
        phoneNumber: cleanPhone
        // Let Prisma handle all defaults
      });
      
      console.log('Created new user for phone:', cleanPhone, 'with ID:', user.id);
    }
    
    return user;
    
  } catch (error) {
    console.error('Error in findOrCreateUser:', error);
    
    if (error.code === 'P2002') {
      throw new Error('Phone number already exists with another account');
    }
    
    throw new Error('Failed to create or find user');
  }
};

// Profile completion
export const updateProfileCompletion = async (userId, profileData) => {
  const { name, email, password } = profileData;
  
  try {
    const updateData = {
      name: name.trim(),
      phoneVerified: true,
      isProfileComplete: true
    };
    
    if (email && email.trim()) {
      updateData.email = email.trim().toLowerCase();
      
      const existingEmailUser = await prisma.user.findUnique({
        where: { email: updateData.email }
      });
      
      if (existingEmailUser && existingEmailUser.id !== Number(userId)) {
        throw new Error('Email address is already registered with another account');
      }
    }
    
    if (password && password.trim()) {
      const saltRounds = 12;
      updateData.password = await bcrypt.hash(password.trim(), saltRounds);
    }
    
    const updatedUser = await prisma.user.update({
      where: { id: Number(userId) },
      data: updateData,
      select: {
        id: true,
        phoneNumber: true,
        name: true,
        email: true,
        phoneVerified: true,
        emailVerified: true,
        isProfileComplete: true,
        role: true,
        createdAt: true,
        updatedAt: true
      }
    });
    
    console.log('Profile completed for user:', userId);
    return updatedUser;
    
  } catch (error) {
    console.error('Error updating profile completion:', error);
    
    if (error.code === 'P2002') {
      throw new Error('Email address is already registered');
    }
    
    throw error;
  }
};

// Get user auth status
export const getUserAuthStatus = async (userId) => {
  if (!userId) return null;
  
  try {
    const user = await prisma.user.findUnique({
      where: { id: Number(userId) },
      select: {
        id: true,
        name: true,
        email: true,
        phoneNumber: true,
        emailVerified: true,
        phoneVerified: true,
        isActive: true,
        isProfileComplete: true,
        role: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user || !user.isActive) {
      return null;
    }

    return user;
    
  } catch (error) {
    console.error('Error getting user auth status:', error);
    return null;
  }
};
