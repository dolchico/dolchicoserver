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
  
  return prisma.user.findUnique({ 
    where: { id: Number(id) },
    select: {
      id: true,
      name: true,
      username: true,        // Add this
      fullName: true,        // Add this
      email: true,
      phoneNumber: true,
      emailVerified: true,
      phoneVerified: true,
      isProfileComplete: true,
      country: true,         // Add this
      state: true,           // Add this
      zip: true,             // Add this
      role: true,
      isActive: true,
      createdAt: true,
      updatedAt: true
    }
  });
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
  const allowedFields = [
    'name', 
    'username',           // Add this
    'fullName',           // Add this
    'email', 
    'phoneNumber', 
    'country',            // Add this
    'state',              // Add this
    'zip',                // Add this
    'emailVerified', 
    'phoneVerified', 
    'isProfileComplete'
  ];
  
  const data = {};
  
  for (const field of allowedFields) {
    if (updateData[field] !== undefined) {
      data[field] = updateData[field];
    }
  }
  
  // Clean and format data
  if (data.email) data.email = data.email.trim().toLowerCase();
  if (data.phoneNumber) data.phoneNumber = data.phoneNumber.trim();
  if (data.username) data.username = data.username.trim().toLowerCase();
  if (data.fullName) data.fullName = data.fullName.trim();
  if (data.name) data.name = data.name.trim();
  if (data.country) data.country = data.country.trim();
  if (data.state) data.state = data.state.trim();
  if (data.zip) data.zip = data.zip.trim();

  if (Object.keys(data).length === 0) {
    throw new Error('No fields provided for update.');
  }

  try {
    return await prisma.user.update({
      where: { id: Number(userId) },
      data: {
        ...data,
        updatedAt: new Date()
      },
      select: {
        id: true,
        name: true,
        username: true,
        fullName: true,
        email: true,
        phoneNumber: true,
        emailVerified: true,
        phoneVerified: true,
        isProfileComplete: true,
        country: true,
        state: true,
        zip: true,
        role: true,
        createdAt: true,
        updatedAt: true
      }
    });
  } catch (err) {
    if (err.code === 'P2002') {
      const target = err.meta?.target;
      if (target?.includes('username')) {
        throw new Error('Username already exists.');
      }
      if (target?.includes('email')) {
        throw new Error('Email already exists.');
      }
      if (target?.includes('phoneNumber')) {
        throw new Error('Phone number already exists.');
      }
      throw new Error('This information already exists.');
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


// Add this to userService.js
export const checkUserExistenceService = async (emailOrPhone) => {
  try {
    const isPhone = /^\+?\d+$/.test(emailOrPhone.trim());
    
    const user = isPhone 
      ? await findUserByPhone(emailOrPhone.trim())
      : await findUserByEmail(emailOrPhone.trim().toLowerCase());

    if (!user) {
      return {
        exists: false,
        loginMethods: ['otp'],
        requiresRegistration: true
      };
    }

    const loginMethods = ['otp'];
    const hasVerifiedContact = isPhone ? user.phoneVerified : user.emailVerified;
    
    if (hasVerifiedContact && user.password) {
      loginMethods.push('password');
    }

    return {
      exists: true,
      loginMethods,
      userRole: user.role,
      isProfileComplete: user.isProfileComplete,
      requiresRegistration: false
    };

  } catch (error) {
    console.error('Error in checkUserExistenceService:', error);
    throw new Error('Failed to check user existence');
  }
};

// services/userService.js - Fix the getUserAuthStatus function
export const getUserAuthStatus = async (userId) => {
  try {
    if (!userId) {
      throw new Error('User ID is required');
    }

    const user = await prisma.user.findUnique({
      where: { id: parseInt(userId) },
      select: {
        id: true,
        name: true,
        email: true,
        phoneNumber: true,
        role: true,
        isActive: true,
        emailVerified: true,
        phoneVerified: true,
        isProfileComplete: true,
        createdAt: true,
        updatedAt: true
        // Remove these lines - they don't exist in your schema:
        // isLocked: false,
        // lockedUntil: null
      }
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Add default values for fields that don't exist in schema
    return {
      ...user,
      isLocked: false,  // Default value since it doesn't exist in schema
      lockedUntil: null // Default value since it doesn't exist in schema
    };
  } catch (error) {
    console.error('Error getting user auth status:', error);
    throw error;
  }
};

export async function sendEmailVerification(userId, email, userName, otp = null) {
  const { token } = await createEmailVerificationToken(userId, 60);
  // sendVerificationEmail(toEmail, token, otp, userName)
  await sendVerificationEmail(email, token, otp, userName || 'User');
  return { success: true };
}
