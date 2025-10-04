import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

import {
  forgotPasswordService,
  resetPasswordService,
  verifyOTP as verifyEmailOTP,
  clearOTP,
} from "../services/authService.js";
import {
  hashToken,
  findEmailVerificationToken,
  markEmailTokenUsed,
  createEmailVerificationToken,
  deleteEmailVerificationToken,
} from "../services/tokenService.js";
import { sendOTPEmail } from "../services/mailService.js";
import { BadRequestError, NotFoundError, TooManyRequestsError } from "../utils/errors.js";
import { determineAuthFlow, findOrCreateUser, updateProfileCompletion } from "../services/userService.js";
import { sendWhatsAppOTP, generateAndStoreOTP, verifyOTP as verifyPhoneOTP } from "../services/msg91Service.js";
import jwt from "jsonwebtoken";
import validator from "validator";
import bcrypt from "bcrypt";
import { validate } from "uuid"; // For UUID validation

// Import user service functions
import {
  sendEmailVerification,
  findUserByEmail,
  findUserByPhone,
  createUser,
} from "../services/userService.js";

// Import SMS service
import { sendOTP as sendSMSOTP } from "../services/smsService.js";

// Validate environment variables
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is not set");
}

export const forgotPassword = async (req, res) => {
  const { emailOrPhone } = req.body;

  if (!emailOrPhone) {
    throw new BadRequestError("Email or phone number is required.");
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
        throw new BadRequestError("Invalid phone number format. Use +91XXXXXXXXXX format.");
      }

      user = await findUserByPhone(emailOrPhone.trim());
      contactType = "phone";

      if (!user) {
        return res.status(200).json({
          success: true,
          message: "If an account with that phone number exists, an OTP has been sent.",
        });
      }

      if (!user.phoneVerified) {
        throw new BadRequestError("Please verify your phone number first.");
      }
    } else {
      // Validate email format
      if (!validator.isEmail(emailOrPhone.trim())) {
        throw new BadRequestError("Invalid email format.");
      }

      const cleanEmail = emailOrPhone.trim().toLowerCase();
      user = await findUserByEmail(cleanEmail);
      contactType = "email";

      if (!user) {
        return res.status(200).json({
          success: true,
          message: "If an account with that email exists, an OTP has been sent.",
        });
      }

      if (!user.emailVerified) {
        throw new BadRequestError("Please verify your email address first.");
      }
    }

    // Validate user.id as UUID
    if (user && !validate(user.id)) {
      throw new BadRequestError("Invalid user ID format.");
    }

    // Check rate limiting
    const recentOTPs = isPhone
      ? await prisma.phoneOTP.count({
          where: {
            userId: user.id,
            type: "PASSWORD_RESET",
            createdAt: {
              gte: new Date(Date.now() - 60000), // Last 1 minute
            },
          },
        })
      : await prisma.emailOTP.count({
          where: {
            userId: user.id,
            type: "PASSWORD_RESET",
            createdAt: {
              gte: new Date(Date.now() - 60000), // Last 1 minute
            },
          },
        });

    if (recentOTPs >= 3) {
      throw new TooManyRequestsError("Too many OTP requests. Please try again in a minute.");
    }

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    if (isPhone) {
      // Clear existing password reset OTPs
      await prisma.phoneOTP.deleteMany({
        where: {
          userId: user.id,
          type: "PASSWORD_RESET",
        },
      });

      // Store phone OTP
      await prisma.phoneOTP.create({
        data: {
          userId: user.id, // Ensure string UUID
          otp,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
          type: "PASSWORD_RESET",
          attempts: 0,
          isUsed: false,
          maxAttempts: 3,
        },
      });

      // Send OTP via SMS/WhatsApp
      try {
        await sendSMSOTP(user.phoneNumber, otp, "password-reset");
        console.log(`[AuthController] Password reset OTP sent via SMS to: ${user.phoneNumber}`);
      } catch (smsError) {
        console.error("[AuthController] Failed to send SMS OTP:", smsError);
        throw new Error("Failed to send OTP. Please try again.");
      }
    } else {
      // Clear existing password reset OTPs
      await prisma.emailOTP.deleteMany({
        where: {
          userId: user.id,
          type: "PASSWORD_RESET",
        },
      });

      // Store email OTP
      await prisma.emailOTP.create({
        data: {
          userId: user.id, // Ensure string UUID
          otp,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
          type: "PASSWORD_RESET",
          attempts: 0,
          isUsed: false,
          maxAttempts: 3,
        },
      });

      // Send OTP via email
      try {
        await sendOTPEmail(user.email, user.name || "User", otp, "password reset");
        console.log(`[AuthController] Password reset OTP sent via email to: ${user.email}`);
      } catch (emailError) {
        console.error("[AuthController] Failed to send email OTP:", emailError);
        throw new Error("Failed to send OTP. Please try again.");
      }
    }

    return res.status(200).json({
      success: true,
      message: `If an account with that ${contactType} exists, an OTP has been sent.`,
      contactType,
      expiresIn: 600, // 10 minutes
    });
  } catch (error) {
    console.error(`[AuthController] Forgot Password Error: ${error.message}`);
    if (error instanceof BadRequestError || error instanceof TooManyRequestsError) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    return res.status(500).json({ success: false, message: "An internal server error occurred." });
  }
};

export const resetPassword = async (req, res) => {
  const { emailOrPhone, otp, newPassword } = req.body;

  // Validate required fields
  if (!emailOrPhone || !otp || !newPassword) {
    throw new BadRequestError("Email/phone number, OTP, and new password are required.");
  }

  // Validate OTP format
  if (!validator.isLength(otp.trim(), { min: 6, max: 6 }) || !validator.isNumeric(otp.trim())) {
    throw new BadRequestError("Invalid OTP format. OTP must be 6 digits.");
  }

  // Validate password strength
  const passwordErrors = [];
  if (!validator.isLength(newPassword, { min: 10 })) {
    passwordErrors.push("Password must be at least 10 characters long.");
  }
  if (!/[A-Z]/.test(newPassword)) {
    passwordErrors.push("Password must contain at least one uppercase letter.");
  }
  if (!/[a-z]/.test(newPassword)) {
    passwordErrors.push("Password must contain at least one lowercase letter.");
  }
  if (!/\d/.test(newPassword)) {
    passwordErrors.push("Password must contain at least one number.");
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(newPassword)) {
    passwordErrors.push("Password must contain at least one special character.");
  }
  if (passwordErrors.length > 0) {
    throw new BadRequestError(`Password does not meet requirements: ${passwordErrors.join(", ")}`);
  }

  try {
    // Determine if input is phone or email
    const isPhone = /^\+\d{1,3}\d{7,}$/.test(emailOrPhone.trim());
    let user;
    let otpRecord;

    if (isPhone) {
      // Validate phone number format
      const phoneRegex = /^\+\d{1,3}\d{7,}$/;
      if (!phoneRegex.test(emailOrPhone.trim())) {
        throw new BadRequestError("Invalid phone number format. Use +[country code][number] format.");
      }

      user = await findUserByPhone(emailOrPhone.trim());
      if (!user) {
        throw new NotFoundError("User not found with this phone number.");
      }

      // Validate user.id as UUID
      if (!validate(user.id)) {
        throw new BadRequestError("Invalid user ID format.");
      }

      // Verify phone OTP
      otpRecord = await prisma.phoneOTP.findFirst({
        where: {
          userId: user.id, // Ensure string UUID
          otp: otp.trim(),
          type: "PASSWORD_RESET",
          isUsed: false,
          expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: "desc" },
      });

      // Increment attempts if OTP is invalid
      if (!otpRecord) {
        const latestOtp = await prisma.phoneOTP.findFirst({
          where: {
            userId: user.id,
            type: "PASSWORD_RESET",
            isUsed: false,
          },
          orderBy: { createdAt: "desc" },
        });
        if (latestOtp) {
          await prisma.phoneOTP.update({
            where: { id: latestOtp.id },
            data: { attempts: latestOtp.attempts + 1 },
          });
        }
      }
    } else {
      // Validate email format
      if (!validator.isEmail(emailOrPhone.trim())) {
        throw new BadRequestError("Invalid email format.");
      }

      const cleanEmail = emailOrPhone.trim().toLowerCase();
      user = await findUserByEmail(cleanEmail);
      if (!user) {
        throw new NotFoundError("User not found with this email address.");
      }

      // Validate user.id as UUID
      if (!validate(user.id)) {
        throw new BadRequestError("Invalid user ID format.");
      }

      // Verify email OTP
      otpRecord = await prisma.emailOTP.findFirst({
        where: {
          userId: user.id, // Ensure string UUID
          otp: otp.trim(),
          type: "PASSWORD_RESET",
          isUsed: false,
          expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: "desc" },
      });

      // Increment attempts if OTP is invalid
      if (!otpRecord) {
        const latestOtp = await prisma.emailOTP.findFirst({
          where: {
            userId: user.id,
            type: "PASSWORD_RESET",
            isUsed: false,
          },
          orderBy: { createdAt: "desc" },
        });
        if (latestOtp) {
          await prisma.emailOTP.update({
            where: { id: latestOtp.id },
            data: { attempts: latestOtp.attempts + 1 },
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
              type: "PASSWORD_RESET",
              expiresAt: { lte: new Date() },
            },
          })
        : await prisma.emailOTP.findFirst({
            where: {
              userId: user.id,
              otp: otp.trim(),
              type: "PASSWORD_RESET",
              expiresAt: { lte: new Date() },
            },
          });

      if (expiredOtp) {
        throw new BadRequestError("OTP has expired. Please request a new one.");
      }

      throw new BadRequestError("Invalid OTP.");
    }

    // Check max attempts
    if (otpRecord.attempts >= otpRecord.maxAttempts) {
      throw new BadRequestError("OTP has exceeded maximum attempts. Please request a new one.");
    }

    // Hash the new password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(newPassword.trim(), saltRounds);

    // Update password and mark OTP as used in a transaction
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id }, // Ensure string UUID
        data: {
          password: hashedPassword,
          updatedAt: new Date(),
        },
      });

      if (isPhone) {
        await tx.phoneOTP.update({
          where: { id: otpRecord.id },
          data: { isUsed: true, attempts: otpRecord.attempts + 1 },
        });

        await tx.phoneOTP.updateMany({
          where: { userId: user.id, type: "PASSWORD_RESET", isUsed: false },
          data: { isUsed: true },
        });
      } else {
        await tx.emailOTP.update({
          where: { id: otpRecord.id },
          data: { isUsed: true, attempts: otpRecord.attempts + 1 },
        });

        await tx.emailOTP.updateMany({
          where: { userId: user.id, type: "PASSWORD_RESET", isUsed: false },
          data: { isUsed: true },
        });
      }
    });

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email, phoneNumber: user.phoneNumber, role: user.role },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    console.log(`[AuthController] Password reset successfully for user: ${user.id}`);

    return res.status(200).json({
      success: true,
      message: "Password has been reset successfully.",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        role: user.role,
      },
    });
  } catch (error) {
    console.error(`[AuthController] Reset Password Error: ${error.message}`);
    if (error instanceof BadRequestError || error instanceof NotFoundError) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    if (error.code === "P2002") {
      return res.status(409).json({ success: false, message: "User data conflict occurred." });
    }
    return res.status(500).json({ success: false, message: "An internal server error occurred." });
  }
};

export const sendOTP = async (req, res) => {
  const { phoneNumber } = req.body;

  // Validation
  if (!phoneNumber) {
    throw new BadRequestError("Phone number is required.");
  }

  // Validate phone number format (Indian format)
  const phoneRegex = /^\+91[6-9]\d{9}$/;
  if (!phoneRegex.test(phoneNumber)) {
    throw new BadRequestError("Invalid phone number format. Use +91XXXXXXXXXX format.");
  }

  try {
    // Get client info for security
    const clientIP = req.ip || req.connection.remoteAddress || "unknown";
    const userAgent = req.get("User-Agent") || "unknown";

    // Determine auth flow
    const { flowType } = await determineAuthFlow(phoneNumber);

    // Create or find user
    const user = await findOrCreateUser(phoneNumber);

    // Validate user.id as UUID
    if (!validate(user.id)) {
      throw new BadRequestError("Invalid user ID format.");
    }

    // Generate and store OTP
    const otpCode = await generateAndStoreOTP(user.id, flowType.toUpperCase(), clientIP, userAgent);

    // Send OTP via WhatsApp
    const whatsappResult = await sendWhatsAppOTP(phoneNumber, otpCode);

    if (!whatsappResult.success) {
      throw new Error("Failed to send WhatsApp OTP");
    }

    console.log(`[AuthController] OTP sent via WhatsApp to: ${phoneNumber} for ${flowType}`);

    return res.status(200).json({
      success: true,
      flowType,
      message: `OTP sent via WhatsApp for ${flowType}`,
      expiresIn: 300, // 5 minutes
      messageId: whatsappResult.messageId,
    });
  } catch (error) {
    console.error(`[AuthController] Send OTP Error: ${error.message}`);
    if (error.message.includes("Rate limit")) {
      return res.status(429).json({ success: false, message: "Too many OTP requests. Please try again later." });
    }
    if (error.message.includes("WhatsApp")) {
      return res.status(503).json({ success: false, message: "Unable to send OTP via WhatsApp. Please try again." });
    }
    return res.status(500).json({ success: false, message: "An internal server error occurred." });
  }
};

export const verifyOTPEndpoint = async (req, res) => {
  const { phoneNumber, otp } = req.body;

  // Validation
  if (!phoneNumber || !otp) {
    throw new BadRequestError("Phone number and OTP are required.");
  }

  if (!/^\d{6}$/.test(otp)) {
    throw new BadRequestError("OTP must be 6 digits.");
  }

  try {
    // Verify OTP
    const { user, otpType } = await verifyPhoneOTP(phoneNumber, otp);

    // Validate user.id as UUID
    if (!validate(user.id)) {
      throw new BadRequestError("Invalid user ID format.");
    }

    // Update user verification status
    await updateUserVerification(user.id);

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        phoneNumber: user.phoneNumber,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Determine next step
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

    console.log(`[AuthController] OTP verified for user: ${user.id}, flowType: ${otpType}`);

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
      message: otpType === "SIGNIN" ? "Successfully signed in" : "Account verified successfully",
    });
  } catch (error) {
    console.error(`[AuthController] Verify OTP Error: ${error.message}`);
    if (error.message.includes("Invalid") || error.message.includes("expired")) {
      return res.status(400).json({ success: false, message: "Invalid or expired OTP. Please request a new one." });
    }
    if (error.message.includes("User not found")) {
      return res.status(404).json({ success: false, message: "Phone number not found. Please request OTP first." });
    }
    return res.status(500).json({ success: false, message: "An internal server error occurred." });
  }
};

export const completeProfile = async (req, res) => {
  const { name, email, password, agreeToTerms, ageConfirmation } = req.body;
  const userId = req.user?.userId;

  // Validation
  if (!userId || !validate(userId)) {
    throw new BadRequestError("Authentication required or invalid user ID.");
  }

  if (!name || !agreeToTerms || !ageConfirmation) {
    throw new BadRequestError("Name, terms agreement, and age confirmation are required.");
  }

  if (name.trim().length < 2 || name.trim().length > 100) {
    throw new BadRequestError("Name must be between 2 and 100 characters long.");
  }

  if (email && !validator.isEmail(email.trim())) {
    throw new BadRequestError("Invalid email format.");
  }

  if (password && !validator.isLength(password, { min: 10 })) {
    throw new BadRequestError("Password must be at least 10 characters long.");
  }

  try {
    const updatedUser = await updateProfileCompletion(userId, {
      name: name.trim(),
      email: email?.trim(),
      password,
    });

    console.log(`[AuthController] Profile completed for user: ${userId}`);

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
    console.error(`[AuthController] Profile Completion Error: ${error.message}`);
    if (error.message.includes("Email") && error.message.includes("exists")) {
      return res.status(409).json({ success: false, message: "Email address is already registered." });
    }
    return res.status(500).json({ success: false, message: "An internal server error occurred." });
  }
};

export async function registerWithEmail(req, res) {
  try {
    const { name, email, password } = req.body;
    if (!email) {
      throw new BadRequestError("Email is required.");
    }

    if (!validator.isEmail(email.trim())) {
      throw new BadRequestError("Invalid email format.");
    }

    if (name && (name.trim().length < 2 || name.trim().length > 100)) {
      throw new BadRequestError("Name must be between 2 and 100 characters long.");
    }

    if (password && !validator.isLength(password, { min: 10 })) {
      throw new BadRequestError("Password must be at least 10 characters long.");
    }

    let user = await findUserByEmail(email.trim().toLowerCase());
    if (!user) {
      user = await createUser({ name: name?.trim(), email: email.trim().toLowerCase(), password });
    }

    // Validate user.id as UUID
    if (!validate(user.id)) {
      throw new BadRequestError("Invalid user ID format.");
    }

    await sendEmailVerification(user.id, user.email, user.name, null);

    console.log(`[AuthController] Registration started for email: ${user.email}`);

    return res.status(200).json({
      success: true,
      message: "Registration started. Check your email to verify.",
    });
  } catch (error) {
    console.error(`[AuthController] Register With Email Error: ${error.message}`);
    if (error instanceof BadRequestError) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    return res.status(500).json({ success: false, message: "Failed to start registration." });
  }
};

export async function resendVerificationEmail(req, res) {
  try {
    const { email } = req.body;
    if (!email) {
      throw new BadRequestError("Email is required.");
    }

    if (!validator.isEmail(email.trim())) {
      throw new BadRequestError("Invalid email format.");
    }

    const user = await findUserByEmail(email.trim().toLowerCase());
    if (!user) {
      return res.status(200).json({
        success: true,
        message: "If the email exists, a verification email was sent.",
      });
    }

    // Validate user.id as UUID
    if (!validate(user.id)) {
      throw new BadRequestError("Invalid user ID format.");
    }

    if (user.emailVerified) {
      return res.status(200).json({ success: true, message: "Email already verified." });
    }

    await sendEmailVerification(user.id, user.email, user.name, null);

    console.log(`[AuthController] Verification email resent to: ${user.email}`);

    return res.status(200).json({ success: true, message: "Verification email sent." });
  } catch (error) {
    console.error(`[AuthController] Resend Verification Email Error: ${error.message}`);
    if (error instanceof BadRequestError) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    return res.status(500).json({ success: false, message: "Failed to send verification email." });
  }
};

export const verifyEmailToken = async (req, res) => {
  const { token } = req.body;

  if (!token) {
    throw new BadRequestError("Verification token is required.", "MISSING_TOKEN");
  }

  try {
    const verificationToken = await findEmailVerificationToken(token);
    if (!verificationToken) {
      throw new BadRequestError("Invalid or expired verification token.", "INVALID_TOKEN");
    }

    // Check expiry and usage
    if (verificationToken.expiresAt < new Date()) {
      throw new BadRequestError("Verification token has expired.", "TOKEN_EXPIRED");
    }

    if (verificationToken.usedAt) {
      throw new BadRequestError("This verification link has already been used.", "TOKEN_USED");
    }

    // Validate userId as UUID
    if (!validate(verificationToken.userId)) {
      throw new BadRequestError("Invalid user ID format.");
    }

    const user = await prisma.user.findUnique({
      where: { id: verificationToken.userId }, // Ensure string UUID
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
      throw new NotFoundError("User account not found.", "USER_NOT_FOUND");
    }

    const result = await prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { id: verificationToken.userId }, // Ensure string UUID
        data: { emailVerified: true },
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

      await tx.emailVerificationToken.update({
        where: { token: hashToken(token) },
        data: { usedAt: new Date() },
      });

      return updatedUser;
    });

    const authToken = jwt.sign(
      {
        id: result.id,
        email: result.email,
        role: result.role,
        emailVerified: true,
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    console.log(`[AuthController] Email verified for user: ${result.id}`);

    return res.status(200).json({
      success: true,
      message: "Email verified successfully!",
      token: authToken,
      user: result,
      requiresProfileCompletion: true,
      nextStep: "profile-completion",
      flowType: "email-verification",
    });
  } catch (error) {
    console.error(`[AuthController] Email Token Verification Error: ${error.message}`);
    if (error instanceof BadRequestError || error instanceof NotFoundError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
        errorCode: error.errorCode || "UNKNOWN",
      });
    }
    return res.status(500).json({
      success: false,
      message: "An internal server error occurred during verification.",
      errorCode: "INTERNAL_ERROR",
    });
  }
};

// Helper function to update user verification status
const updateUserVerification = async (userId) => {
  if (!validate(userId)) {
    throw new BadRequestError("Invalid user ID format.");
  }
  try {
    await prisma.user.update({
      where: { id: userId }, // Ensure string UUID
      data: {
        phoneVerified: true,
        lastLoginAt: new Date(),
      },
    });
  } catch (error) {
    console.error(`[AuthController] Error updating user verification: ${error.message}`);
    // Don't throw error to avoid disrupting successful verification
  }
};