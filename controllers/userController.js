import validator from "validator";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import prisma from "../lib/prisma.js";

import {
    findUserByEmail,
    findUserByPhone,
    createUser,
    verifyUserEmail,
    verifyUserPhone,
    checkUserExistenceService,
    updateProfile,
    findUserById,
    resendEmailVerificationService,
} from "../services/userService.js";

// OTP-related services
import {
    storeEmailOTP,
    verifyEmailOtpService,
    storePhoneOTP,
    verifyEmailOTPByUserId,
    verifyPhoneOtpService,
} from "../services/otpService.js";
import {
    sendAccountDeletionOtp,
    verifyAndDeleteAccount,
} from "../services/accountService.js";

// Email verification token helpers
import {
    createEmailVerificationToken,
    findEmailVerificationToken,
    deleteEmailVerificationToken,
} from "../services/tokenService.js";

// Email/SMS services
import { sendOTP } from "../services/smsService.js";
import {
    sendVerificationEmail,
    sendOTPEmail,
} from "../services/mailService.js";

// --------- Helper JWT issuer ----------
const issueJwt = (id) =>
    jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "7d" });

export const registerUser = async (req, res) => {
    try {
        const { email, phoneNumber } = req.body;

        /* --------------------------- email flow --------------------------- */
        if (email) {
            const existing = await findUserByEmail(email);
            if (existing) {
                if (existing.emailVerified) {
                    return res.status(409).json({
                        success: false,
                        message: "Email already registered. Log in instead.",
                    });
                }

                /* resend verification email */
                const token = await createEmailVerificationToken(existing.id);
                const otp = String(Math.floor(100000 + Math.random() * 900000));
                await storeEmailOTP(existing.id, otp);

                await sendVerificationEmail(existing.email, token, otp, "User");

                return res.status(200).json({
                    success: true,
                    message: "Verification email resent.",
                    userId: existing.id,
                    verificationType: "email",
                    requiresProfileCompletion: !existing.isProfileComplete,
                });
            }

            /* create new user */
            const user = await createUser({
                email: email.toLowerCase().trim(),
                emailVerified: false,
                phoneVerified: false,
                isProfileComplete: false,
            });

            const token = await createEmailVerificationToken(user.id);
            const otp = String(Math.floor(100000 + Math.random() * 900000));
            await storeEmailOTP(user.id, otp);

            await sendVerificationEmail(user.email, token, otp, "User");

            return res.status(201).json({
                success: true,
                message:
                    "Registration successful. Check your email for verification.",
                userId: user.id,
                verificationType: "email",
                contactInfo: user.email,
                requiresProfileCompletion: true,
            });
        } else if (phoneNumber) {
            /* --------------------------- phone flow --------------------------- */
            const phone = phoneNumber.trim();

            const existingPhone = await findUserByPhone(phone);
            if (existingPhone) {
                if (existingPhone.phoneVerified) {
                    return res.status(409).json({
                        success: false,
                        message:
                            "Phone number already registered. Log in instead.",
                    });
                }

                /* resend OTP */
                const otp = String(Math.floor(100000 + Math.random() * 900000));
                await storePhoneOTP(existingPhone.id, otp);
                await sendOTP(existingPhone.phoneNumber, otp);

                return res.status(200).json({
                    success: true,
                    message: "OTP resent to your phone.",
                    userId: existingPhone.id,
                    verificationType: "phone",
                    requiresProfileCompletion: !existingPhone.isProfileComplete,
                });
            }

            /* create new phone user */
            const user = await createUser({
                phoneNumber: phone,
                emailVerified: false,
                phoneVerified: false,
                isProfileComplete: false,
            });

            const otp = String(Math.floor(100000 + Math.random() * 900000));
            await storePhoneOTP(user.id, otp);
            await sendOTP(user.phoneNumber, otp);

            return res.status(201).json({
                success: true,
                message:
                    "Registration successful. Check your phone for OTP verification.",
                userId: user.id,
                verificationType: "phone",
                contactInfo: user.phoneNumber,
                contactInfo: user.phoneNumber,
                requiresProfileCompletion: true,
            });
        } else {
            return res.status(400).json({
                success: false,
                message: "Email or phone number is required for registration.",
            });
        }
    } catch (error) {
        console.error("Registration error:", error);
        return res.status(500).json({
            message: "Internal server error. Please try again later.",
        });
    }
};

export const verifyEmailOtp = async (req, res) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({
                success: false,
                message: "Email and OTP are required.",
            });
        }

        const user = await findUserByEmail(email);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found with this email address.",
            });
        }

        // Verify email OTP
        const isValidOtp = await verifyEmailOtpService(email, otp);
        if (!isValidOtp.success) {
            return res.status(400).json({
                success: false,
                message: isValidOtp.message || "Invalid or expired OTP.",
            });
        }

        // Mark email as verified
        await verifyUserEmail(user.id);

        // Check if profile is complete
        if (user.isProfileComplete && user.name && user.password) {
            // User already has profile - login directly
            return res.status(200).json({
                success: true,
                message: "Email verified successfully.",
                token: issueJwt(user.id),
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    emailVerified: true,
                    isProfileComplete: true,
                },
            });
        } else {
            // User needs to complete profile
            return res.status(200).json({
                success: true,
                message:
                    "Email verified successfully. Please complete your profile.",
                userId: user.id,
                requiresProfileCompletion: true,
            });
        }
    } catch (err) {
        console.error("Email OTP verification error:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error.",
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
                message: "Phone number and OTP are required.",
            });
        }

        const user = await findUserByPhone(phoneNumber);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found with this phone number.",
            });
        }

        // Verify phone OTP
        const isValidOtp = await verifyPhoneOtpService(user.id, otp);
        if (!isValidOtp) {
            return res.status(400).json({
                success: false,
                message: "Invalid or expired OTP.",
            });
        }

        // Mark phone as verified
        await verifyUserPhone(user.id);

        // Check if profile is complete
        if (user.isProfileComplete && user.name && user.password) {
            // User already has profile - login directly
            return res.status(200).json({
                success: true,
                message: "Phone verified successfully.",
                token: issueJwt(user.id),
                user: {
                    id: user.id,
                    phoneNumber: user.phoneNumber,
                    name: user.name,
                    phoneVerified: true,
                    isProfileComplete: true,
                },
            });
        } else {
            // User needs to complete profile
            return res.status(200).json({
                success: true,
                message:
                    "Phone verified successfully. Please complete your profile.",
                userId: user.id,
                requiresProfileCompletion: true,
            });
        }
    } catch (err) {
        console.error("Phone OTP verification error:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error.",
        });
    }
};

/* ===========================================================================
   4. Complete User Profile (after OTP verification)
============================================================================ */
// export const completeProfile = async (req, res) => {
//   try {
//     const { userId, name, password } = req.body;

//     // Validation
//     if (!userId || !name || !password) {
//       return res.status(400).json({
//         success: false,
//         message: 'User ID, name, and password are required.'
//       });
//     }

//     if (password.length < 8) {
//       return res.status(400).json({
//         success: false,
//         message: 'Password must be at least 8 characters long.'
//       });
//     }

//     // Find user
//     const user = await findUserById(userId);
//     if (!user) {
//       return res.status(404).json({
//         success: false,
//         message: 'User not found.'
//       });
//     }

//     // Check if user is verified
//     if (!user.emailVerified && !user.phoneVerified) {
//       return res.status(400).json({
//         success: false,
//         message: 'Please verify your email or phone first.'
//       });
//     }

//     // Hash password
//     const saltRounds = 12;
//     const hashedPassword = await bcrypt.hash(password.trim(), saltRounds);

//     // Update user profile
//     const updateData = {
//       name: name.trim(),
//       password: hashedPassword,
//       isProfileComplete: true,
//       updatedAt: new Date()
//     };

//     const updatedUser = await prisma.user.update({
//       where: { id: Number(userId) },
//       data: updateData,
//       select: {
//         id: true,
//         name: true,
//         email: true,
//         phoneNumber: true,
//         emailVerified: true,
//         phoneVerified: true,
//         isProfileComplete: true,
//         role: true,
//         createdAt: true,
//         updatedAt: true
//       }
//     });

//     console.log('Profile completed for user:', userId);

//     return res.status(200).json({
//       success: true,
//       message: 'Profile completed successfully.',
//       token: issueJwt(updatedUser.id),
//       user: updatedUser
//     });

//   } catch (err) {
//     console.error('Profile completion error:', err);

//     if (err.code === 'P2002') {
//       return res.status(409).json({
//         success: false,
//         message: 'Profile information already exists.'
//       });
//     }

//     return res.status(500).json({
//       success: false,
//       message: 'Internal server error. Please try again.'
//     });
//   }
// };

export const completeProfile = async (req, res) => {
    try {
        const {
            userId,
            name,
            password,
            // Optional profile fields
            username,
            fullName,
            country,
            state,
            zip,
        } = req.body;

        // Required field validation
        if (!userId || !name || !password) {
            return res.status(400).json({
                success: false,
                message: "User ID, name, and password are required.",
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 8 characters long.",
            });
        }

        // Optional field validation
        if (username && username.length < 3) {
            return res.status(400).json({
                success: false,
                message: "Username must be at least 3 characters long.",
            });
        }

        // Find user
        const user = await findUserById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found.",
            });
        }

        // Check if user is verified
        if (!user.emailVerified && !user.phoneVerified) {
            return res.status(400).json({
                success: false,
                message: "Please verify your email or phone first.",
            });
        }

        // Check if username is already taken (if provided)
        if (username) {
            const existingUsername = await prisma.user.findFirst({
                where: {
                    username: username.trim().toLowerCase(),
                    NOT: { id: Number(userId) },
                },
            });

            if (existingUsername) {
                return res.status(409).json({
                    success: false,
                    message: "Username is already taken.",
                });
            }
        }

        // Hash password
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(password.trim(), saltRounds);

        // Build update data (only include fields that are provided)
        const updateData = {
            name: name.trim(),
            password: hashedPassword,
            isProfileComplete: true,
            updatedAt: new Date(),
        };

        // Add optional fields if provided
        if (username) updateData.username = username.trim().toLowerCase();
        if (fullName) updateData.fullName = fullName.trim();
        if (country) updateData.country = country.trim();
        if (state) updateData.state = state.trim();
        if (zip) updateData.zip = zip.trim();

        const updatedUser = await prisma.user.update({
            where: { id: Number(userId) },
            data: updateData,
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
                updatedAt: true,
            },
        });

        console.log("Profile completed for user:", userId);

        return res.status(200).json({
            success: true,
            message: "Profile completed successfully.",
            token: issueJwt(updatedUser.id),
            user: updatedUser,
        });
    } catch (err) {
        console.error("Profile completion error:", err);

        if (err.code === "P2002") {
            // Handle unique constraint violations
            const target = err.meta?.target;
            if (target?.includes("username")) {
                return res.status(409).json({
                    success: false,
                    message: "Username is already taken.",
                });
            }
            return res.status(409).json({
                success: false,
                message: "Profile information already exists.",
            });
        }

        return res.status(500).json({
            success: false,
            message: "Internal server error. Please try again.",
        });
    }
};

export const loginUser = async (req, res) => {
    try {
        const { emailOrPhone, password } = req.body;

        if (!password) {
            return res.status(400).json({
                success: false,
                message: "Password is required.",
            });
        }

        if (!emailOrPhone) {
            return res.status(400).json({
                success: false,
                message: "Email or phone number is required.",
            });
        }

        // Determine if input is phone or email
        const isPhone = /^\+?\d+$/.test(emailOrPhone.trim());
        let user;

        if (isPhone) {
            user = await findUserByPhone(emailOrPhone.trim());
            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: "User not found with this phone number.",
                });
            }
            if (!user.phoneVerified) {
                return res.status(403).json({
                    success: false,
                    message:
                        "Please verify your phone number before logging in.",
                });
            }
        } else {
            const cleanEmail = emailOrPhone.trim().toLowerCase();
            user = await findUserByEmail(cleanEmail);
            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: "User not found with this email address.",
                });
            }
            if (!user.emailVerified) {
                return res.status(403).json({
                    success: false,
                    message: "Please verify your email before logging in.",
                });
            }
        }

        if (!user.password) {
            return res.status(401).json({
                success: false,
                message: "Please complete your profile setup first.",
            });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: "Invalid password.",
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
                isProfileComplete: user.isProfileComplete,
            },
        });
    } catch (err) {
        console.error("Login error:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

/* ===========================================================================
   6. Update User Profile (Protected Route)
============================================================================ */
// export const updateUserProfile = async (req, res) => {
//   try {
//     if (!req.user || !req.user.id) {
//       return res.status(401).json({ success: false, message: "Unauthorized" });
//     }
//     if (!req.body || Object.keys(req.body).length === 0) {
//       return res.status(400).json({ success: false, message: 'No update fields provided.' });
//     }

//     const userId = req.user.id;

//     // Remove fields that have dedicated endpoints (excluding phone since we're not implementing it)
//     const {
//       email,           // Has dedicated email change flow
//       password,        // Has dedicated password change flow
//       ...updateFields
//     } = req.body;

//     // Validate excluded fields
//     if (email !== undefined) {
//       return res.status(400).json({
//         success: false,
//         message: 'Email changes must use /request-email-change endpoint'
//       });
//     }
//     if (password !== undefined) {
//       return res.status(400).json({
//         success: false,
//         message: 'Password changes must use /change-password endpoint'
//       });
//     }

//     await updateProfile(userId, updateFields);

//     const user = await findUserById(userId);
//     if (!user) {
//       return res.status(404).json({ success: false, message: 'User not found.' });
//     }

//     res.json({ success: true, message: 'Profile updated', user });
//   } catch (err) {
//     let msg = err.message || 'Profile update failed';
//     if (err.code === 'P2002') {
//       msg = 'Email or phone number already exists.';
//     }
//     res.status(400).json({ success: false, message: msg });
//   }
// };

// POST /request-email-change
// POST /request-email-change
// POST /request-email-change
export const updateUserProfile = async (req, res) => {
    try {
        if (!req.user || !req.user.id) {
            return res
                .status(401)
                .json({ success: false, message: "Unauthorized" });
        }
        if (!req.body || Object.keys(req.body).length === 0) {
            return res.status(400).json({
                success: false,
                message: "No update fields provided.",
            });
        }

        const userId = req.user.id;

        // Remove fields that have dedicated endpoints
        const {
            email, // Has dedicated email change flow
            password, // Has dedicated password change flow
            ...updateFields
        } = req.body;

        // Validate excluded fields
        if (email !== undefined) {
            return res.status(400).json({
                success: false,
                message:
                    "Email changes must use /request-email-change endpoint",
            });
        }
        if (password !== undefined) {
            return res.status(400).json({
                success: false,
                message: "Password changes must use /change-password endpoint",
            });
        }

        // ADD THIS: Username validation
        if (updateFields.username !== undefined) {
            if (updateFields.username && updateFields.username.length < 3) {
                return res.status(400).json({
                    success: false,
                    message: "Username must be at least 3 characters long.",
                });
            }

            if (updateFields.username) {
                const existingUsername = await prisma.user.findFirst({
                    where: {
                        username: updateFields.username.trim().toLowerCase(),
                        NOT: { id: Number(userId) },
                    },
                });

                if (existingUsername) {
                    return res.status(409).json({
                        success: false,
                        message: "Username is already taken.",
                    });
                }
            }
        }

        await updateProfile(userId, updateFields);

        const user = await findUserById(userId);
        if (!user) {
            return res
                .status(404)
                .json({ success: false, message: "User not found." });
        }

        res.json({ success: true, message: "Profile updated", user });
    } catch (err) {
        let msg = err.message || "Profile update failed";

        // Enhanced error handling for P2002 constraints
        if (err.code === "P2002") {
            const target = err.meta?.target;
            if (target?.includes("username")) {
                msg = "Username is already taken.";
            } else if (target?.includes("email")) {
                msg = "Email already exists.";
            } else if (target?.includes("phoneNumber")) {
                msg = "Phone number already exists.";
            } else {
                msg = "This information already exists.";
            }
        }

        res.status(400).json({ success: false, message: msg });
    }
};

export const requestEmailChange = async (req, res) => {
    try {
        const userId = req.user.userId || req.user.id;
        const newEmail = (req.body?.newEmail || "").trim().toLowerCase();

        if (!newEmail) return res.status(400).json({ error: "Email required" });
        if (!validator.isEmail(newEmail))
            return res.status(400).json({ error: "Invalid email format" });

        const user = await prisma.user.findUnique({
            where: { id: Number(userId) },
        });
        if (!user) return res.status(404).json({ error: "User not found" });

        if (user.email && user.email.toLowerCase() === newEmail)
            return res
                .status(400)
                .json({ error: "New email is the same as current email" });

        const existing = await prisma.user.findFirst({
            where: { email: newEmail, NOT: { id: Number(userId) } },
        });
        if (existing)
            return res.status(409).json({ error: "Email already in use" });

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        await storeEmailOTP(Number(userId), otp, "EMAIL_CHANGE");

        await prisma.user.update({
            where: { id: Number(userId) },
            data: {
                resetToken: `EMAIL_CHANGE:${newEmail}`,
                pendingEmail: newEmail,
            },
        });

        await sendOTPEmail(newEmail, otp, "email change");
        return res.status(200).json({ message: "OTP sent to new e-mail" });
    } catch (err) {
        console.error("requestEmailChange error:", err);
        if (err.code === "P2002")
            return res.status(409).json({ error: "Email already in use" });
        return res.status(500).json({ error: "Internal server error" });
    }
};

// POST /verify-email-change
export const verifyEmailChange = async (req, res) => {
    try {
        const userId = req.user.userId || req.user.id;
        const { otp } = req.body;

        // Basic validation
        if (!otp) {
            return res.status(400).json({ error: "OTP required" });
        }
        if (
            !validator.isLength(otp.trim(), { min: 6, max: 6 }) ||
            !validator.isNumeric(otp.trim())
        ) {
            return res.status(400).json({ error: "Invalid OTP format" });
        }

        // Use the correct function that accepts userId
        const isValid = await verifyEmailOTPByUserId(userId, otp.trim());

        if (!isValid) {
            return res.status(400).json({
                error: "Invalid or expired OTP",
            });
        }

        // Get user and update email
        const user = await findUserById(userId);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        // Extract new email from resetToken (where you stored "EMAIL_CHANGE:newEmail")
        const newEmail = user.resetToken?.replace("EMAIL_CHANGE:", "").trim();
        if (!newEmail || !validator.isEmail(newEmail)) {
            return res
                .status(400)
                .json({ error: "No pending email change found" });
        }

        // Update user email
        await updateProfile(userId, {
            email: newEmail,
            emailVerified: true,
        });

        // Clear the resetToken
        await prisma.user.update({
            where: { id: Number(userId) },
            data: {
                resetToken: null,
                pendingEmail: null,
                pendingEmailOtp: null,
                pendingEmailExpiry: null,
            },
        });

        return res.status(200).json({
            message: "Email updated successfully",
            user: { email: newEmail },
        });
    } catch (err) {
        console.error("verifyEmailChange error:", err);

        if (err.code === "P2002") {
            return res.status(409).json({ error: "Email already in use" });
        }

        return res.status(500).json({ error: "Internal server error" });
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
            return res
                .status(400)
                .json({ success: false, message: "Email is required." });
        }

        // Validate email format
        if (!validator.isEmail(email)) {
            return res
                .status(400)
                .json({ success: false, message: "Invalid email address." });
        }

        // Call the service to handle the business logic
        const result = await resendEmailVerificationService(email);

        // Handle different scenarios based on the service response
        if (result.alreadyVerified) {
            return res.status(409).json({
                success: false,
                message: "Email is already verified. You can log in.",
            });
        }

        if (result.success) {
            return res.status(200).json({
                success: true,
                message:
                    "A new verification email has been sent. Please check your inbox.",
            });
        }

        // For security (email enumeration protection), we send the same generic response
        // whether the user exists or not
        return res.status(200).json({
            success: true,
            message:
                "If an account with that email exists and is not verified, a new verification email has been sent.",
        });
    } catch (err) {
        console.error("Resend Verification Email Controller Error:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
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
            return res.status(400).json({
                success: false,
                message: "Verification token required.",
            });
        }

        const record = await findEmailVerificationToken(token);
        if (!record) {
            return res
                .status(400)
                .json({ success: false, message: "Invalid or expired token." });
        }

        if (new Date() > record.expiresAt) {
            await deleteEmailVerificationToken(token);
            return res.status(410).json({
                success: false,
                message: "Verification token expired.",
            });
        }

        await verifyUserEmail(record.userId);
        await deleteEmailVerificationToken(token);

        return res.status(200).json({
            success: true,
            message: "Email verified. You may now log in.",
        });
    } catch (err) {
        console.error(err);
        return res
            .status(500)
            .json({ success: false, message: "Internal server error" });
    }
};

export const checkUserExistence = async (req, res) => {
    try {
        const { emailOrPhone } = req.body;

        if (!emailOrPhone) {
            return res
                .status(400)
                .json({ message: "Email or phone is required." });
        }

        // Only check existence, do NOT send OTP here
        const result = await checkUserExistenceService(emailOrPhone);

        // Return available login methods (e.g., password, otp)
        // Do NOT send OTP automatically
        return res.status(200).json(result);
    } catch (error) {
        console.error("Error in checkUserExistence:", error);
        return res.status(500).json({ message: "Internal server error." });
    }
};

/* ===========================================================================
   NEW: Unified Send OTP (for both new and existing users)
============================================================================ */
export const sendUnifiedOTP = async (req, res) => {
    try {
        const { emailOrPhone } = req.body;

        if (!emailOrPhone) {
            return res.status(400).json({
                success: false,
                message: "Email or phone number is required.",
            });
        }

        // Determine if it's email or phone
        const isPhone = /^\+?\d+$/.test(emailOrPhone.trim());
        const contactType = isPhone ? "phone" : "email";

        // Check if user exists
        const existingUser = isPhone
            ? await findUserByPhone(emailOrPhone.trim())
            : await findUserByEmail(emailOrPhone.trim());

        let userId = null;
        let isNewUser = false;

        if (!existingUser) {
            // Create new user if doesn't exist
            const userData = isPhone
                ? { phoneNumber: emailOrPhone.trim() }
                : { email: emailOrPhone.trim().toLowerCase() };

            const newUser = await createUser({
                ...userData,
                emailVerified: false,
                phoneVerified: false,
                isProfileComplete: false,
            });

            userId = newUser.id;
            isNewUser = true;
        } else {
            userId = existingUser.id;
        }

        // Generate and send OTP
        const otp = String(Math.floor(100000 + Math.random() * 900000));

        if (isPhone) {
            await storePhoneOTP(userId, otp);
            await sendOTP(emailOrPhone.trim(), otp);
        } else {
            await storeEmailOTP(userId, otp);
            // For email, you might want to send both token and OTP
            const token = await createEmailVerificationToken(userId);
            await sendVerificationEmail(
                emailOrPhone.trim(),
                token,
                otp,
                "User"
            );
        }

        res.status(200).json({
            success: true,
            message: "OTP sent successfully",
            userId: isNewUser ? userId : undefined, // Only return userId for new users
            userExists: !isNewUser,
            contactType,
        });
    } catch (error) {
        console.error("Send unified OTP error:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to send OTP",
        });
    }
};

/* ===========================================================================
   NEW: Enhanced Check User (for dynamic auth flow)
============================================================================ */
export const checkUserForAuth = async (req, res) => {
    try {
        const { emailOrPhone } = req.body;

        if (!emailOrPhone) {
            return res.status(400).json({
                success: false,
                message: "Email or phone number is required.",
            });
        }

        const isPhone = /^\+?\d+$/.test(emailOrPhone.trim());
        const user = isPhone
            ? await findUserByPhone(emailOrPhone.trim())
            : await findUserByEmail(emailOrPhone.trim());

        if (!user) {
            return res.status(200).json({
                exists: false,
                loginMethods: ["otp"], // New users can only use OTP initially
                requiresRegistration: true,
            });
        }

        // Determine available login methods for existing users
        const loginMethods = ["otp"]; // OTP always available

        // Add password option if user has verified contact and password
        const hasVerifiedContact = isPhone
            ? user.phoneVerified
            : user.emailVerified;
        if (hasVerifiedContact && user.password) {
            loginMethods.push("password");
        }

        res.status(200).json({
            exists: true,
            loginMethods,
            userRole: user.role,
            isProfileComplete: user.isProfileComplete,
            requiresRegistration: false,
        });
    } catch (error) {
        console.error("Check user for auth error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to check user",
        });
    }
};

/* ===========================================================================
   NEW: Send OTP to Existing Users (separate endpoints)
============================================================================ */
export const sendEmailOTPToExisting = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res
                .status(400)
                .json({ success: false, message: "Email is required." });
        }

        const user = await findUserByEmail(email.trim().toLowerCase());
        if (!user) {
            return res
                .status(404)
                .json({ success: false, message: "User not found." });
        }

        // Generate and send OTP only when this endpoint is called
        const otp = String(Math.floor(100000 + Math.random() * 900000));
        await storeEmailOTP(user.id, otp);

        // Create token for email verification
        const token = await createEmailVerificationToken(user.id);
        await sendVerificationEmail(
            user.email,
            token,
            otp,
            user.name || "User"
        );

        res.status(200).json({
            success: true,
            message: "OTP sent to your email successfully",
        });
    } catch (error) {
        console.error("Send email OTP error:", error);
        res.status(500).json({ success: false, message: "Failed to send OTP" });
    }
};

export const sendPhoneOTPToExisting = async (req, res) => {
    try {
        const { phoneNumber } = req.body;

        if (!phoneNumber) {
            return res.status(400).json({
                success: false,
                message: "Phone number is required.",
            });
        }

        const user = await findUserByPhone(phoneNumber.trim());
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found with this phone number.",
            });
        }

        // Generate and send OTP
        const otp = String(Math.floor(100000 + Math.random() * 900000));
        await storePhoneOTP(user.id, otp);
        await sendOTP(user.phoneNumber, otp);

        res.status(200).json({
            success: true,
            message: "OTP sent to your phone successfully",
        });
    } catch (error) {
        console.error("Send phone OTP error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to send OTP",
        });
    }
};

export const requestAccountDeletion = async (req, res) => {
    try {
        const userId = req.user.userId || req.user.id;
        const result = await sendAccountDeletionOtp(userId);
        res.status(200).json(result);
    } catch (err) {
        console.error("requestAccountDeletion error:", err.message);
        res.status(400).json({ error: err.message });
    }
};

export const verifyAccountDeletion = async (req, res) => {
    try {
        const userId = req.user.userId || req.user.id;
        const { otp } = req.body;
        const result = await verifyAndDeleteAccount(userId, otp);
        res.status(200).json(result);
    } catch (err) {
        console.error("verifyAccountDeletion error:", err.message);
        res.status(400).json({ error: err.message });
    }
};

/* ===========================================================================
   9. Get User Profile (Protected Route)
============================================================================ */
export const getUserProfile = async (req, res) => {
    try {
        // The user's ID is attached to the request object by the authentication middleware.
        const userId = req.user?.id;

        if (!userId) {
            // This case should ideally be caught by the auth middleware, but it's good practice to double-check.
            return res.status(401).json({
                success: false,
                message: "Unauthorized: No user ID found in token.",
            });
        }

        // Use the existing 'findUserById' service to get the user's data.
        const user = await findUserById(userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found.",
            });
        }

        // IMPORTANT: Exclude sensitive information like the password before sending the response.
        // The 'user' object from findUserById already excludes the password, which is great.
        // We will explicitly return the fields to ensure no sensitive data is ever leaked.
        const userProfile = {
            id: user.id,
            name: user.name,
            username: user.username || "", // Fallback for missing field
            fullName: user.fullName || "", // Fallback for missing field
            email: user.email,
            phoneNumber: user.phoneNumber,
            emailVerified: user.emailVerified,
            phoneVerified: user.phoneVerified,
            isProfileComplete: user.isProfileComplete,
            country: user.country || "INDIA", // Fallback for missing field
            state: user.state || "Punjab", // Fallback for missing field
            zip: user.zip || "144410", // Fallback for missing field
            createdAt: user.createdAt,
        };

        return res.status(200).json({
            success: true,
            user: userProfile,
        });
    } catch (err) {
        console.error("Get User Profile Error:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};
