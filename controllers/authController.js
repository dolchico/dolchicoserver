import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

import { 
  forgotPasswordService, 
  resetPasswordService, 
  verifyOTP as verifyEmailOTP, 
  clearOTP 
} from '../services/authService.js';
import { 
  hashToken,
  findEmailVerificationToken, 
  markEmailTokenUsed,
  createEmailVerificationToken,
  deleteEmailVerificationToken
} from '../services/tokenService.js';
import { sendOTPEmail } from '../services/mailService.js';
import { ValidationError, NotFoundError } from '../utils/errors.js';
import { determineAuthFlow, findOrCreateUser, updateProfileCompletion } from '../services/userService.js';
import { sendWhatsAppOTP, generateAndStoreOTP, verifyOTP as verifyPhoneOTP } from '../services/msg91Service.js';
import jwt from 'jsonwebtoken';
import validator from 'validator';
import bcrypt from 'bcrypt';

// Import user service functions
import { 
  sendEmailVerification, 
  findUserByEmail, 
  findUserByPhone,
  createUser 
} from '../services/userService.js';

// Import SMS service
import { sendOTP as sendSMSOTP } from '../services/smsService.js';
import * as userService from '../services/userService.js'; // Adjust path as needed



export const forgotPassword = async (req, res) => {
  const { emailOrPhone } = req.body;

  if (!emailOrPhone) {
    return res.status(400).json({ 
      success: false, 
      message: 'Email or phone number is required.' 
    });
  }

  try {
    // Determine if input is phone or email
    const isPhone = /^\+91[6-9]\d{9}$/.test(emailOrPhone.trim());
    let user;
    let contactType;

    if (isPhone) {
      // Validate phone number format
      const phoneRegex = /^\+91[6-9]\d{9}$/;
      if (!phoneRegex.test(emailOrPhone.trim())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid phone number format. Use +91XXXXXXXXXX format.'
        });
      }

      user = await findUserByPhone(emailOrPhone.trim());
      contactType = 'phone';
      
      if (!user) {
        return res.status(200).json({
          success: true,
          message: 'If an account with that phone number exists, an OTP has been sent.'
        });
      }

      if (!user.phoneVerified) {
        return res.status(400).json({
          success: false,
          message: 'Please verify your phone number first.'
        });
      }
    } else {
      // Validate email format
      if (!validator.isEmail(emailOrPhone.trim())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid email format.'
        });
      }

      const cleanEmail = emailOrPhone.trim().toLowerCase();
      user = await findUserByEmail(cleanEmail);
      contactType = 'email';
      
      if (!user) {
        return res.status(200).json({
          success: true,
          message: 'If an account with that email exists, an OTP has been sent.'
        });
      }

      if (!user.emailVerified) {
        return res.status(400).json({
          success: false,
          message: 'Please verify your email address first.'
        });
      }
    }

    // Check rate limiting
    const recentOTPs = isPhone 
      ? await prisma.phoneOTP.count({
          where: {
            userId: user.id,
            type: 'PASSWORD_RESET',
            createdAt: {
              gte: new Date(Date.now() - 60000) // Last 1 minute
            }
          }
        })
      : await prisma.emailOTP.count({
          where: {
            userId: user.id,
            type: 'PASSWORD_RESET',
            createdAt: {
              gte: new Date(Date.now() - 60000) // Last 1 minute
            }
          }
        });

    if (recentOTPs >= 3) {
      return res.status(429).json({
        success: false,
        message: 'Too many OTP requests. Please try again in a minute.'
      });
    }

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    if (isPhone) {
      // Clear existing password reset OTPs for this user
      await prisma.phoneOTP.deleteMany({
        where: {
          userId: user.id,
          type: 'PASSWORD_RESET'
        }
      });

      // Store phone OTP
      await prisma.phoneOTP.create({
        data: {
          userId: user.id,
          otp,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
          type: 'PASSWORD_RESET',
          attempts: 0,
          isUsed: false,
          maxAttempts: 3
        }
      });

      // Send OTP via SMS/WhatsApp
      try {
        await sendSMSOTP(user.phoneNumber, otp, 'password-reset');
        console.log('Password reset OTP sent via SMS to:', user.phoneNumber);
      } catch (smsError) {
        console.error('Failed to send SMS OTP:', smsError);
        return res.status(500).json({
          success: false,
          message: 'Failed to send OTP. Please try again.'
        });
      }
    } else {
      // Clear existing password reset OTPs for this user
      await prisma.emailOTP.deleteMany({
        where: {
          userId: user.id,
          type: 'PASSWORD_RESET'
        }
      });

      // Store email OTP
      await prisma.emailOTP.create({
        data: {
          userId: user.id,
          otp,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
          type: 'PASSWORD_RESET',
          attempts: 0,
          isUsed: false,
          maxAttempts: 3
        }
      });

      // Send OTP via email
      try {
        await sendOTPEmail(user.email, user.name || 'User', otp, 'password reset');
        console.log('Password reset OTP sent via email to:', user.email);
      } catch (emailError) {
        console.error('Failed to send email OTP:', emailError);
        return res.status(500).json({
          success: false,
          message: 'Failed to send OTP. Please try again.'
        });
      }
    }

    // Always return a generic success message to prevent user enumeration
    return res.status(200).json({
      success: true,
      message: `If an account with that ${contactType} exists, an OTP has been sent.`,
      contactType,
      expiresIn: 600 // 10 minutes
    });

  } catch (error) {
    console.error('Forgot Password Controller Error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'An internal server error occurred.' 
    });
  }
};
export const resetPassword = async (req, res) => {
  const { emailOrPhone, otp, newPassword } = req.body;

  // Validate required fields
  if (!emailOrPhone || !otp || !newPassword) {
    return res.status(400).json({ 
      success: false, 
      message: 'Email/phone number, OTP, and new password are required.' 
    });
  }

  // Validate OTP format
  if (!validator.isLength(otp.trim(), { min: 6, max: 6 }) || !validator.isNumeric(otp.trim())) {
    return res.status(400).json({ 
      success: false, 
      message: 'Invalid OTP format. OTP must be 6 digits.' 
    });
  }

  // Validate password strength (aligned with frontend)
  const passwordErrors = [];
  if (!validator.isLength(newPassword, { min: 10 })) {
    passwordErrors.push('Password must be at least 10 characters long.');
  }
  if (!/[A-Z]/.test(newPassword)) {
    passwordErrors.push('Password must contain at least one uppercase letter.');
  }
  // if (!/[a-z]/.test(newPassword)) {
  //   passwordErrors.push('Password must contain at least one lowercase letter.');
  // }
  if (!/\d/.test(newPassword)) {
    passwordErrors.push('Password must contain at least one number.');
  }
  // if (!/[!@#$%^&*(),.?":{}|<>]/.test(newPassword)) {
  //   passwordErrors.push('Password must contain at least one special character.');
  // }
  if (passwordErrors.length > 0) {
    return res.status(400).json({ 
      success: false, 
      message: `Password does not meet requirements: ${passwordErrors.join(', ')}` 
    });
  }

  try {
    // Determine if input is phone or email
    const isPhone = /^\+\d{1,3}\d{7,}$/.test(emailOrPhone.trim()); // More flexible phone regex
    let user;
    let otpRecord;

    if (isPhone) {
      // Validate phone number format
      const phoneRegex = /^\+\d{1,3}\d{7,}$/;
      if (!phoneRegex.test(emailOrPhone.trim())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid phone number format. Use +[country code][number] format.'
        });
      }

      user = await findUserByPhone(emailOrPhone.trim());
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found with this phone number.'
        });
      }

      // Verify phone OTP
      otpRecord = await prisma.phoneOTP.findFirst({
        where: {
          userId: user.id,
          otp: otp.trim(),
          type: 'PASSWORD_RESET',
          isUsed: false,
          expiresAt: {
            gt: new Date()
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      // Increment attempts if OTP is invalid
      if (!otpRecord) {
        const latestOtp = await prisma.phoneOTP.findFirst({
          where: {
            userId: user.id,
            type: 'PASSWORD_RESET',
            isUsed: false
          },
          orderBy: {
            createdAt: 'desc'
          }
        });
        if (latestOtp) {
          await prisma.phoneOTP.update({
            where: { id: latestOtp.id },
            data: { attempts: latestOtp.attempts + 1 }
          });
        }
      }
    } else {
      // Validate email format
      if (!validator.isEmail(emailOrPhone.trim())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid email format.'
        });
      }

      const cleanEmail = emailOrPhone.trim().toLowerCase();
      user = await findUserByEmail(cleanEmail);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found with this email address.'
        });
      }

      // Verify email OTP
      otpRecord = await prisma.emailOTP.findFirst({
        where: {
          userId: user.id,
          otp: otp.trim(),
          type: 'PASSWORD_RESET',
          isUsed: false,
          expiresAt: {
            gt: new Date()
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      // Increment attempts if OTP is invalid
      if (!otpRecord) {
        const latestOtp = await prisma.emailOTP.findFirst({
          where: {
            userId: user.id,
            type: 'PASSWORD_RESET',
            isUsed: false
          },
          orderBy: {
            createdAt: 'desc'
          }
        });
        if (latestOtp) {
          await prisma.emailOTP.update({
            where: { id: latestOtp.id },
            data: { attempts: latestOtp.attempts + 1 }
          });
        }
      }
    }

    if (!otpRecord) {
      const expiredOtp = isPhone
        ? await prisma.phoneOTP.findFirst({
            where: {
              userId: user.id,
              otp: otp.trim(),
              type: 'PASSWORD_RESET',
              expiresAt: {
                lte: new Date()
              }
            }
          })
        : await prisma.emailOTP.findFirst({
            where: {
              userId: user.id,
              otp: otp.trim(),
              type: 'PASSWORD_RESET',
              expiresAt: {
                lte: new Date()
              }
            }
          });

      if (expiredOtp) {
        return res.status(400).json({
          success: false,
          message: 'OTP has expired. Please request a new one.'
        });
      }

      return res.status(400).json({ 
        success: false, 
        message: 'Invalid OTP.' 
      });
    }

    // Check if max attempts exceeded
    if (otpRecord.attempts >= otpRecord.maxAttempts) {
      return res.status(400).json({
        success: false,
        message: 'OTP has exceeded maximum attempts. Please request a new one.'
      });
    }

    // Hash the new password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(newPassword.trim(), saltRounds);

    // Update password and mark OTP as used in a transaction
    await prisma.$transaction(async (tx) => {
      // Update user password
      await tx.user.update({
        where: { id: user.id },
        data: { 
          password: hashedPassword,
          updatedAt: new Date()
        }
      });

      // Mark OTP as used
      if (isPhone) {
        await tx.phoneOTP.update({
          where: { id: otpRecord.id },
          data: { 
            isUsed: true,
            attempts: otpRecord.attempts + 1
          }
        });

        await tx.phoneOTP.updateMany({
          where: {
            userId: user.id,
            type: 'PASSWORD_RESET',
            isUsed: false
          },
          data: {
            isUsed: true
          }
        });
      } else {
        await tx.emailOTP.update({
          where: { id: otpRecord.id },
          data: { 
            isUsed: true,
            attempts: otpRecord.attempts + 1
          }
        });

        await tx.emailOTP.updateMany({
          where: {
            userId: user.id,
            type: 'PASSWORD_RESET',
            isUsed: false
          },
          data: {
            isUsed: true
          }
        });
      }
    });

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email, phoneNumber: user.phoneNumber, role: user.role },
      process.env.JWT_SECRET || 'your_jwt_secret', // Replace with your secret
      { expiresIn: '7d' }
    );

    console.log('Password reset successfully for user:', user.id);

    res.status(200).json({
      success: true,
      message: 'Password has been reset successfully.',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        role: user.role
      }
    });
  } catch (err) {
    console.error('Reset Password Controller Error:', err);

    if (err.code === 'P2002') {
      return res.status(409).json({
        success: false,
        message: 'User data conflict occurred.'
      });
    }

    res.status(500).json({ 
      success: false, 
      message: 'An internal server error occurred.' 
    });
  }
};

export const sendOTP = async (req, res) => {
    const { phoneNumber } = req.body;

    // Validation
    if (!phoneNumber) {
        return res.status(400).json({
            success: false,
            message: "Phone number is required.",
        });
    }

    // Validate phone number format (Indian format)
    const phoneRegex = /^\+91[6-9]\d{9}$/;
    if (!phoneRegex.test(phoneNumber)) {
        return res.status(400).json({
            success: false,
            message: "Invalid phone number format. Use +91XXXXXXXXXX format.",
        });
    }

    try {
        // Get client info for security
        const clientIP = req.ip || req.connection.remoteAddress || "unknown";
        const userAgent = req.get("User-Agent") || "unknown";

        // Rate limiting check (basic implementation - enhance as needed)
        // You can implement more sophisticated rate limiting later

        // Determine if this is signin or signup flow
        const { flowType } = await determineAuthFlow(phoneNumber);

        // Create or find user (unified approach)
        const user = await findOrCreateUser(phoneNumber);

        // Generate and store OTP
        const otpCode = await generateAndStoreOTP(
            user.id,
            flowType.toUpperCase(),
            clientIP,
            userAgent
        );

        // Send OTP via WhatsApp using MSG91
        const whatsappResult = await sendWhatsAppOTP(phoneNumber, otpCode);

        if (!whatsappResult.success) {
            throw new Error("Failed to send WhatsApp OTP");
        }

        // Success response (consistent with your existing pattern)
        return res.status(200).json({
            success: true,
            flowType, // 'signin' or 'signup'
            message: `OTP sent via WhatsApp for ${flowType}`,
            expiresIn: 300, // 5 minutes
            messageId: whatsappResult.messageId,
        });
    } catch (error) {
        console.error("Send OTP Controller Error:", error);

        // Handle specific errors
        if (error.message.includes("Rate limit")) {
            return res.status(429).json({
                success: false,
                message: "Too many OTP requests. Please try again later.",
            });
        }

        if (error.message.includes("WhatsApp")) {
            return res.status(503).json({
                success: false,
                message: "Unable to send OTP via WhatsApp. Please try again.",
            });
        }

        // Generic error response
        return res.status(500).json({
            success: false,
            message: "An internal server error occurred.",
        });
    }
};

/**
 * CONTROLLER for POST /verify-otp
 * Verifies OTP and determines next step (dashboard or profile completion)
 */
export const verifyOTPEndpoint = async (req, res) => {
    const { phoneNumber, otp } = req.body;

    // Validation
    if (!phoneNumber || !otp) {
        return res.status(400).json({
            success: false,
            message: "Phone number and OTP are required.",
        });
    }

    if (!/^\d{6}$/.test(otp)) {
        return res.status(400).json({
            success: false,
            message: "OTP must be 6 digits.",
        });
    }

    try {
        // Verify OTP using service
        const { user, otpType } = await verifyPhoneOTP(phoneNumber, otp);

        // Update user verification status
        await updateUserVerification(user.id);

        // Generate JWT token (consistent with your existing auth pattern)
        const token = jwt.sign(
            {
                userId: user.id,
                phoneNumber: user.phoneNumber,
                role: user.role,
            },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        // Determine next step based on flow type and profile completion
        let nextStep;
        let requiresProfileCompletion = false;

        if (otpType === "SIGNIN" && user.isProfileComplete) {
            nextStep = "dashboard";
        } else if (otpType === "SIGNIN" && !user.isProfileComplete) {
            nextStep = "profile-completion";
            requiresProfileCompletion = true;
        } else if (otpType === "SIGNUP") {
            nextStep = "profile-completion";
            requiresProfileCompletion = true;
        }

        // Success response (Myntra-style)
        return res.status(200).json({
            success: true,
            token,
            user: {
                id: user.id,
                phoneNumber: user.phoneNumber,
                name: user.name,
                email: user.email,
                isProfileComplete: user.isProfileComplete,
                phoneVerified: true,
            },
            nextStep,
            flowType: otpType.toLowerCase(),
            requiresProfileCompletion,
            message:
                otpType === "SIGNIN"
                    ? "Successfully signed in"
                    : "Account verified successfully",
        });
    } catch (error) {
        console.error("Verify OTP Controller Error:", error);

        // Handle specific errors
        if (
            error.message.includes("Invalid") ||
            error.message.includes("expired")
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid or expired OTP. Please request a new one.",
            });
        }

        if (error.message.includes("User not found")) {
            return res.status(404).json({
                success: false,
                message: "Phone number not found. Please request OTP first.",
            });
        }

        // Generic error response
        return res.status(500).json({
            success: false,
            message: "An internal server error occurred.",
        });
    }
};

/**
 * CONTROLLER for POST /complete-profile
 * For new users to complete their profile after OTP verification
 */
export const completeProfile = async (req, res) => {
    const { name, email, password, agreeToTerms, ageConfirmation } = req.body;

    // Get user ID from JWT token (set by your auth middleware)
    const userId = req.user?.userId;

    if (!userId) {
        return res.status(401).json({
            success: false,
            message: "Authentication required.",
        });
    }

    // Validation
    if (!name || !agreeToTerms || !ageConfirmation) {
        return res.status(400).json({
            success: false,
            message:
                "Name, terms agreement, and age confirmation are required.",
        });
    }

    if (name.trim().length < 2) {
        return res.status(400).json({
            success: false,
            message: "Name must be at least 2 characters long.",
        });
    }

    // Validate email format if provided
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({
            success: false,
            message: "Invalid email format.",
        });
    }

    // Validate password if provided
    if (password && password.length < 6) {
        return res.status(400).json({
            success: false,
            message: "Password must be at least 6 characters long.",
        });
    }

    try {
        // Update user profile using service
        const updatedUser = await updateProfileCompletion(userId, {
            name: name.trim(),
            email: email?.trim(),
            password,
        });

        // Success response
        return res.status(200).json({
            success: true,
            user: {
                id: updatedUser.id,
                phoneNumber: updatedUser.phoneNumber,
                name: updatedUser.name,
                email: updatedUser.email,
                isProfileComplete: true,
                phoneVerified: true,
            },
            message: "Profile completed successfully. Welcome aboard!",
        });
    } catch (error) {
        console.error("Profile Completion Controller Error:", error);

        // Handle specific errors
        if (
            error.message.includes("Email") &&
            error.message.includes("exists")
        ) {
            return res.status(409).json({
                success: false,
                message: "Email address is already registered.",
            });
        }

        // Generic error response
        return res.status(500).json({
            success: false,
            message: "An internal server error occurred.",
        });
    }
};

// ================================
// HELPER FUNCTIONS
// ================================

/**
 * Helper function to update user verification status
 */
const updateUserVerification = async (userId) => {
    try {
        await prisma.user.update({
            where: { id: userId },
            data: {
                phoneVerified: true,
                lastLoginAt: new Date(),
            },
        });
    } catch (error) {
        console.error("Error updating user verification:", error);
        // Don't throw error here as verification is successful
    }
};

export async function registerWithEmail(req, res) {
    try {
        const { name, email, password } = req.body;
        if (!email)
            return res
                .status(400)
                .json({ success: false, message: "Email is required." });

        // create user or find existing
        let user = await findUserByEmail(email);
        if (!user) {
            user = await createUser({ name, email, password });
        }

        await sendEmailVerification(
            user.id,
            user.email,
            user.name,
            /* otp */ null
        );

        return res.status(200).json({
            success: true,
            message: "Registration started. Check your email to verify.",
        });
    } catch (e) {
        console.error("registerWithEmail error:", e);
        return res
            .status(500)
            .json({ success: false, message: "Failed to start registration." });
    }
}

export async function resendVerificationEmail(req, res) {
    try {
        const { email } = req.body;
        if (!email)
            return res
                .status(400)
                .json({ success: false, message: "Email is required." });
        const user = await findUserByEmail(email);
        if (!user) {
            // Generic response to avoid enumeration
            return res
                .status(200)
                .json({
                    success: true,
                    message:
                        "If the email exists, a verification email was sent.",
                });
        }
        if (user.emailVerified) {
            return res
                .status(200)
                .json({ success: true, message: "Email already verified." });
        }
        await sendEmailVerification(user.id, user.email, user.name, null);
        return res
            .status(200)
            .json({ success: true, message: "Verification email sent." });
    } catch (e) {
        console.error("resendVerificationEmail error:", e);
        return res
            .status(500)
            .json({
                success: false,
                message: "Failed to send verification email.",
            });
    }
}
export const verifyEmailToken = async (req, res) => {
    const { token } = req.body;

    if (!token) {
        return res.status(400).json({
            success: false,
            message: "Verification token is required.",
            errorCode: "MISSING_TOKEN",
        });
    }

    try {
        // Use the function from tokenService.js
        const verificationToken = await findEmailVerificationToken(token);

        if (!verificationToken) {
            return res.status(400).json({
                success: false,
                message: "Invalid or expired verification token.",
                errorCode: "INVALID_TOKEN",
            });
        }

        // Check expiry and usage
        if (verificationToken.expiresAt < new Date()) {
            return res.status(400).json({
                success: false,
                message: "Verification token has expired.",
                errorCode: "TOKEN_EXPIRED",
            });
        }

        if (verificationToken.usedAt) {
            return res.status(400).json({
                success: false,
                message: "This verification link has already been used.",
                errorCode: "TOKEN_USED",
            });
        }

        // Get user details
        const user = await prisma.user.findUnique({
            where: { id: verificationToken.userId },
            select: {
                id: true,
                name: true,
                email: true,
                phoneNumber: true,
                emailVerified: true,
                phoneVerified: true,
                isProfileComplete: true,
                role: true,
            },
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User account not found.",
                errorCode: "USER_NOT_FOUND",
            });
        }

        // Use transaction for atomic operations
        const result = await prisma.$transaction(async (tx) => {
            // Update user email verification status
            const updatedUser = await tx.user.update({
                where: { id: verificationToken.userId },
                data: {
                    emailVerified: true,
                },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    phoneNumber: true,
                    emailVerified: true,
                    phoneVerified: true,
                    isProfileComplete: true,
                    role: true,
                },
            });

            // Mark token as used - now hashToken is properly imported
            await tx.emailVerificationToken.update({
                where: { token: hashToken(token) },
                data: { usedAt: new Date() },
            });

            return updatedUser;
        });

        // Generate JWT token
const authToken = jwt.sign(
  {
    id: result.id,      // use 'id' instead of 'userId'
    email: result.email,
    role: result.role,
    emailVerified: true,
  },
  process.env.JWT_SECRET,
  { expiresIn: "7d" }
);


        // Always require profile completion
        return res.status(200).json({
            success: true,
            message: "Email verified successfully!",
            token: authToken,
            user: result,
            requiresProfileCompletion: true, // Always true for email verification
            nextStep: "profile-completion",
            flowType: "email-verification", // Add this flag
        });
    } catch (error) {
        console.error("Email Token Verification Error:", error);
        return res.status(500).json({
            success: false,
            message: "An internal server error occurred during verification.",
            errorCode: "INTERNAL_ERROR",
        });
    }
};
