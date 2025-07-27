import validator from 'validator';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma.js';

// User-related services
import {
  findUserByEmail,
  findUserByPhone,
  createUser,
  verifyUserEmail,
  verifyUserPhone,
  updateProfile,
  findUserById,
  resendEmailVerificationService
} from '../services/userService.js';

// OTP-related services
import { 
  storeEmailOTP, 
  verifyEmailOtpService,
  storePhoneOTP,
  verifyPhoneOtpService
} from '../services/otpService.js';

// Email verification token helpers
import {
  createEmailVerificationToken,
  findEmailVerificationToken,
  deleteEmailVerificationToken
} from '../services/tokenService.js';

// Email/SMS services
import { sendOTP } from '../services/smsService.js';
import { sendVerificationEmail } from '../services/mailService.js';

// --------- Helper JWT issuer ----------
const issueJwt = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });

/* ===========================================================================
   1. User Registration (email or phone only - no name/password required)
============================================================================ */
// export const registerUser = async (req, res) => {
//   try {
//     const { email, phoneNumber } = req.body;

//     // --- Validation: Must provide either email or phone ---
//     if (!email && !phoneNumber) {
//       return res.status(400).json({ 
//         success: false, 
//         message: 'Either email or phone number is required.' 
//       });
//     }

//     if (email && phoneNumber) {
//       return res.status(400).json({ 
//         success: false, 
//         message: 'Please provide either email or phone number, not both.' 
//       });
//     }

//     let user;
//     let verificationType;

//     // --- Email Registration Flow ---
//     if (email) {
//       // Validate email format
//       if (!validator.isEmail(email)) {
//         return res.status(400).json({ 
//           success: false, 
//           message: 'Invalid email address format.' 
//         });
//       }

//       // Check if user already exists
//       const existingUser = await findUserByEmail(email);
//       if (existingUser) {
//         if (existingUser.emailVerified && existingUser.isProfileComplete) {
//           return res.status(409).json({ 
//             success: false, 
//             message: 'Email already registered. Please proceed with login.' 
//           });
//         } else {
//           // User exists but not verified or profile incomplete - resend verification
//           const token = await createEmailVerificationToken(existingUser.id);
//           const otp = Math.floor(100000 + Math.random() * 900000).toString();
//           await storeEmailOTP(existingUser.id, otp);
//           await sendVerificationEmail(existingUser.email, token, otp);
          
//           return res.status(200).json({
//             success: true,
//             message: 'Verification email resent. Please check your email to verify your account.',
//             userId: existingUser.id,
//             verificationType: 'email',
//             requiresProfileCompletion: !existingUser.isProfileComplete
//           });
//         }
//       }

//       // Create new user with email only
//       user = await createUser({
//         email: email.trim().toLowerCase(),
//         phoneNumber: null,
//         name: null, // Will be filled after verification
//         emailVerified: false,
//         phoneVerified: false,
//         isProfileComplete: false
//       });

//       verificationType = 'email';

//       // Generate verification token and OTP for email
//       const token = await createEmailVerificationToken(user.id);
//       const otp = Math.floor(100000 + Math.random() * 900000).toString();
//       await storeEmailOTP(user.id, otp);

//       // Send verification email
//       await sendVerificationEmail(user.email, token, otp);

//     } 
//     // --- Phone Registration Flow ---
//     else if (phoneNumber) {
//       // Validate phone number format
//       if (!validator.isMobilePhone(String(phoneNumber), 'any')) {
//         return res.status(400).json({ 
//           success: false, 
//           message: 'Invalid phone number format.' 
//         });
//       }

//       const cleanPhone = phoneNumber.trim();

//       // Check if user already exists
//       const existingUser = await findUserByPhone(cleanPhone);
//       if (existingUser) {
//         if (existingUser.phoneVerified && existingUser.isProfileComplete) {
//           return res.status(409).json({ 
//             success: false, 
//             message: 'Phone number already registered. Please proceed with login.' 
//           });
//         } else {
//           // User exists but not verified or profile incomplete - resend OTP
//           const otp = Math.floor(100000 + Math.random() * 900000).toString();
//           await storePhoneOTP(existingUser.id, otp);
//           await sendOTP(existingUser.phoneNumber, otp);
          
//           return res.status(200).json({
//             success: true,
//             message: 'Verification OTP resent to your phone number.',
//             userId: existingUser.id,
//             verificationType: 'phone',
//             requiresProfileCompletion: !existingUser.isProfileComplete
//           });
//         }
//       }

//       // Create new user with phone only
//       user = await createUser({
//         email: null,
//         phoneNumber: cleanPhone,
//         name: null, // Will be filled after verification
//         emailVerified: false,
//         phoneVerified: false,
//         isProfileComplete: false
//       });

//       verificationType = 'phone';

//       // Generate and send SMS OTP
//       const otp = Math.floor(100000 + Math.random() * 900000).toString();
//       await storePhoneOTP(user.id, otp);
//       await sendOTP(user.phoneNumber, otp);
//     }

//     return res.status(201).json({
//       success: true,
//       message: verificationType === 'email' 
//         ? 'Registration successful. Check your email for verification instructions.' 
//         : 'Registration successful. Check your phone for verification OTP.',
//       userId: user.id,
//       verificationType,
//       contactInfo: verificationType === 'email' ? user.email : user.phoneNumber,
//       requiresProfileCompletion: true
//     });

//   } catch (err) {
//     console.error('Registration error:', err);
//     return res.status(500).json({ 
//       success: false, 
//       message: 'Internal server error. Please try again.' 
//     });
//   }
// };

export const registerUser = async (req, res) => {
  try {
    const { email, phoneNumber } = req.body;

    /* --------------------- basic payload validation --------------------- */
    if (!email && !phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'Either email or phone number is required.'
      });
    }
    if (email && phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'Provide only one credential — email or phone, not both.'
      });
    }

    /* --------------------------- email flow --------------------------- */
    if (email) {
      if (!validator.isEmail(email)) {
        return res.status(400).json({ success: false, message: 'Invalid email format.' });
      }

      const existing = await findUserByEmail(email);
      if (existing) {
        if (existing.emailVerified) {
          return res.status(409).json({ success: false, message: 'Email already registered. Log in instead.' });
        }

        /* resend verification email */
        const token = await createEmailVerificationToken(existing.id);
        const otp   = String(Math.floor(100000 + Math.random() * 900000));
        await storeEmailOTP(existing.id, otp);
        
        // ✅ Removed name reference - just use 'User' as default
        await sendVerificationEmail(existing.email, token, otp, 'User');

        return res.status(200).json({
          success: true,
          message: 'Verification email resent.',
          userId: existing.id,
          verificationType: 'email',
          requiresProfileCompletion: !existing.isProfileComplete
        });
      }

      /* create new user */
      const user = await createUser({
        email: email.toLowerCase().trim(),
        emailVerified: false,
        phoneVerified: false,
        isProfileComplete: false
      });

      const token = await createEmailVerificationToken(user.id);
      const otp   = String(Math.floor(100000 + Math.random() * 900000));
      await storeEmailOTP(user.id, otp);

      // ✅ Already correct - using 'User' as default
      await sendVerificationEmail(user.email, token, otp, 'User');

      return res.status(201).json({
        success: true,
        message: 'Registration successful. Check your email for verification.',
        userId: user.id,
        verificationType: 'email',
        contactInfo: user.email,
        requiresProfileCompletion: true
      });
    }

    /* --------------------------- phone flow --------------------------- */
    const phone = phoneNumber.trim();
    if (!validator.isMobilePhone(phone, 'any')) {
      return res.status(400).json({ success: false, message: 'Invalid phone number.' });
    }

    const existingPhone = await findUserByPhone(phone);
    if (existingPhone) {
      if (existingPhone.phoneVerified) {
        return res.status(409).json({ success: false, message: 'Phone number already registered. Log in instead.' });
      }

      /* resend OTP */
      const otp = String(Math.floor(100000 + Math.random() * 900000));
      await storePhoneOTP(existingPhone.id, otp);
      await sendOTP(existingPhone.phoneNumber, otp);

      return res.status(200).json({
        success: true,
        message: 'OTP resent to your phone.',
        userId: existingPhone.id,
        verificationType: 'phone',
        requiresProfileCompletion: !existingPhone.isProfileComplete
      });
    }

    /* create new phone user */
    const user = await createUser({
      phoneNumber: phone,
      emailVerified: false,
      phoneVerified: false,
      isProfileComplete: false
    });

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    await storePhoneOTP(user.id, otp);
    await sendOTP(user.phoneNumber, otp);

    return res.status(201).json({
      success: true,
      message: 'Registration successful. Check your phone for OTP verification.',
      userId: user.id,
      verificationType: 'phone',
      contactInfo: user.phoneNumber,
      requiresProfileCompletion: true
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error. Please try again later.'
    });
  }
};


/* ===========================================================================
   2. Email OTP Verification
============================================================================ */
export const verifyEmailOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Email and OTP are required.'
      });
    }

    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found with this email address.'
      });
    }

    // Verify email OTP
    const isValidOtp = await verifyEmailOtpService(email, otp);
    if (!isValidOtp.success) {
      return res.status(400).json({
        success: false,
        message: isValidOtp.message || 'Invalid or expired OTP.'
      });
    }

    // Mark email as verified
    await verifyUserEmail(user.id);

    // Check if profile is complete
    if (user.isProfileComplete && user.name && user.password) {
      // User already has profile - login directly
      return res.status(200).json({
        success: true,
        message: 'Email verified successfully.',
        token: issueJwt(user.id),
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          emailVerified: true,
          isProfileComplete: true
        }
      });
    } else {
      // User needs to complete profile
      return res.status(200).json({
        success: true,
        message: 'Email verified successfully. Please complete your profile.',
        userId: user.id,
        requiresProfileCompletion: true
      });
    }

  } catch (err) {
    console.error('Email OTP verification error:', err);
    return res.status(500).json({
      success: false,
      message: 'Internal server error.'
    });
  }
};

/* ===========================================================================
   3. Phone OTP Verification
============================================================================ */
export const verifyPhoneOtp = async (req, res) => {
  try {
    const { phoneNumber, otp } = req.body;

    if (!phoneNumber || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Phone number and OTP are required.'
      });
    }

    const user = await findUserByPhone(phoneNumber);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found with this phone number.'
      });
    }

    // Verify phone OTP
    const isValidOtp = await verifyPhoneOtpService(user.id, otp);
    if (!isValidOtp) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP.'
      });
    }

    // Mark phone as verified
    await verifyUserPhone(user.id);

    // Check if profile is complete
    if (user.isProfileComplete && user.name && user.password) {
      // User already has profile - login directly
      return res.status(200).json({
        success: true,
        message: 'Phone verified successfully.',
        token: issueJwt(user.id),
        user: {
          id: user.id,
          phoneNumber: user.phoneNumber,
          name: user.name,
          phoneVerified: true,
          isProfileComplete: true
        }
      });
    } else {
      // User needs to complete profile
      return res.status(200).json({
        success: true,
        message: 'Phone verified successfully. Please complete your profile.',
        userId: user.id,
        requiresProfileCompletion: true
      });
    }

  } catch (err) {
    console.error('Phone OTP verification error:', err);
    return res.status(500).json({
      success: false,
      message: 'Internal server error.'
    });
  }
};

/* ===========================================================================
   4. Complete User Profile (after OTP verification)
============================================================================ */
export const completeProfile = async (req, res) => {
  try {
    const { userId, name, password } = req.body;

    // Validation
    if (!userId || !name || !password) {
      return res.status(400).json({
        success: false,
        message: 'User ID, name, and password are required.'
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long.'
      });
    }

    // Find user
    const user = await findUserById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    // Check if user is verified
    if (!user.emailVerified && !user.phoneVerified) {
      return res.status(400).json({
        success: false,
        message: 'Please verify your email or phone first.'
      });
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password.trim(), saltRounds);

    // Update user profile
    const updateData = {
      name: name.trim(),
      password: hashedPassword,
      isProfileComplete: true,
      updatedAt: new Date()
    };

    const updatedUser = await prisma.user.update({
      where: { id: Number(userId) },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        phoneNumber: true,
        emailVerified: true,
        phoneVerified: true,
        isProfileComplete: true,
        role: true,
        createdAt: true,
        updatedAt: true
      }
    });

    console.log('Profile completed for user:', userId);

    return res.status(200).json({
      success: true,
      message: 'Profile completed successfully.',
      token: issueJwt(updatedUser.id),
      user: updatedUser
    });

  } catch (err) {
    console.error('Profile completion error:', err);
    
    if (err.code === 'P2002') {
      return res.status(409).json({
        success: false,
        message: 'Profile information already exists.'
      });
    }
    
    return res.status(500).json({
      success: false,
      message: 'Internal server error. Please try again.'
    });
  }
};

/* ===========================================================================
   5. Login with Email/Phone and Password
============================================================================ */
export const loginUser = async (req, res) => {
  try {
    const { email, phoneNumber, password } = req.body;

    if (!password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Password is required.' 
      });
    }

    let user;

    if (email) {
      const cleanEmail = email.trim().toLowerCase();
      user = await findUserByEmail(cleanEmail);
      
      if (!user) {
        return res.status(401).json({ 
          success: false, 
          message: 'User not found with this email address.' 
        });
      }

      if (!user.emailVerified) {
        return res.status(403).json({ 
          success: false, 
          message: 'Please verify your email before logging in.' 
        });
      }
    } else if (phoneNumber) {
      user = await findUserByPhone(phoneNumber);
      
      if (!user) {
        return res.status(401).json({ 
          success: false, 
          message: 'User not found with this phone number.' 
        });
      }

      if (!user.phoneVerified) {
        return res.status(403).json({ 
          success: false, 
          message: 'Please verify your phone number before logging in.' 
        });
      }
    } else {
      return res.status(400).json({ 
        success: false, 
        message: 'Email or phone number is required.' 
      });
    }

    if (!user.password) {
      return res.status(401).json({ 
        success: false, 
        message: 'Please complete your profile setup first.' 
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid password.' 
      });
    }

    return res.status(200).json({ 
      success: true, 
      token: issueJwt(user.id),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        emailVerified: user.emailVerified,
        phoneVerified: user.phoneVerified,
        isProfileComplete: user.isProfileComplete
      }
    });

  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
};

/* ===========================================================================
   6. Update User Profile (Protected Route)
============================================================================ */
export const updateUserProfile = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({ success: false, message: 'No update fields provided.' });
    }

    const userId = req.user.id;

    // Prepare the update fields
    const updateFields = { ...req.body };

    if (updateFields.email !== undefined) {
      updateFields.emailVerified = false;
    }
    if (updateFields.phoneNumber !== undefined) {
      updateFields.phoneVerified = false;
    }

    await updateProfile(userId, updateFields);

    const user = await findUserById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    res.json({ success: true, message: 'Profile updated', user });
  } catch (err) {
    let msg = err.message || 'Profile update failed';
    if (err.code === 'P2002') {
      msg = 'Email or phone number already exists.';
    }
    res.status(400).json({ success: false, message: msg });
  }
};

/* ===========================================================================
   7. Resend Email Verification
============================================================================ */
export const resendVerificationEmail = async (req, res) => {
  try {
    const { email } = req.body;

    // Basic input validation
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required.' });
    }

    // Validate email format
    if (!validator.isEmail(email)) {
      return res.status(400).json({ success: false, message: 'Invalid email address.' });
    }

    // Call the service to handle the business logic
    const result = await resendEmailVerificationService(email);

    // Handle different scenarios based on the service response
    if (result.alreadyVerified) {
      return res.status(409).json({ 
        success: false, 
        message: 'Email is already verified. You can log in.' 
      });
    }

    if (result.success) {
      return res.status(200).json({
        success: true,
        message: 'A new verification email has been sent. Please check your inbox.'
      });
    }

    // For security (email enumeration protection), we send the same generic response
    // whether the user exists or not
    return res.status(200).json({
      success: true,
      message: 'If an account with that email exists and is not verified, a new verification email has been sent.'
    });

  } catch (err) {
    console.error('Resend Verification Email Controller Error:', err);
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
};

/* ===========================================================================
   8. Email Verification via Link
============================================================================ */
export const verifyEmail = async (req, res) => {
  try {
    const token = req.query.token;
      
    if (!token) {
      return res.status(400).json({ success: false, message: 'Verification token required.' });
    }

    const record = await findEmailVerificationToken(token);
    if (!record) {
      return res.status(400).json({ success: false, message: 'Invalid or expired token.' });
    }

    if (new Date() > record.expiresAt) {
      await deleteEmailVerificationToken(token);
      return res.status(410).json({ success: false, message: 'Verification token expired.' });
    }

    await verifyUserEmail(record.userId);
    await deleteEmailVerificationToken(token);

    return res.status(200).json({ success: true, message: 'Email verified. You may now log in.' });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
