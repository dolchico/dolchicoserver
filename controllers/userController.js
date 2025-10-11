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

export const completeProfile = async (req, res) => {
    try {
        const {
            userId,
            name,
            password,
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
                    NOT: { id: userId }, // Use string userId
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

        // Build update data
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
            where: { id: userId }, // Use string userId
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
            email,
            password,
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

        // Username validation
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
                        NOT: { id: userId }, // Use string userId
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

        // D.O.B. validation (optional)
        if (updateFields.dob !== undefined && updateFields.dob !== null && updateFields.dob !== "") {
            const date = new Date(updateFields.dob);
            if (isNaN(date.getTime())) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid date of birth format. Use YYYY-MM-DD.",
                });
            }
            updateFields.dob = date.toISOString();
        }
        console.log('Received updateFields:', updateFields);
        await updateProfile(userId, updateFields);
        
        const user = await findUserById(userId);
        console.log('User after update:', user);
        if (!user) {
            return res
                .status(404)
                .json({ success: false, message: "User not found." });
        }

        res.json({ success: true, message: "Profile updated", user });
    } catch (err) {
        let msg = err.message || "Profile update failed";

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
            where: { id: userId }, // Use string userId
        });
        if (!user) return res.status(404).json({ error: "User not found" });

        if (user.email && user.email.toLowerCase() === newEmail)
            return res
                .status(400)
                .json({ error: "New email is the same as current email" });

        const existing = await prisma.user.findFirst({
            where: { email: newEmail, NOT: { id: userId } }, // Use string userId
        });
        if (existing)
            return res.status(409).json({ error: "Email already in use" });

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        await storeEmailOTP(userId, otp, "EMAIL_CHANGE"); // Use string userId

        await prisma.user.update({
            where: { id: userId }, // Use string userId
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

        // Extract new email from resetToken
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
            where: { id: userId }, // Use string userId
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

export const requestPhoneChange = async (req, res) => {
    try {
        const userId = req.user.id;
        const { newPhoneNumber } = req.body;

        // Input validation
        if (!newPhoneNumber) {
            return res.status(400).json({ 
                success: false, 
                message: 'New phone number is required.' 
            });
        }

        // Validate phone number format
        if (!validator.isMobilePhone(newPhoneNumber)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid phone number format.' 
            });
        }

        // Check if phone number is already in use
        const existingUser = await prisma.user.findUnique({
            where: { phoneNumber: newPhoneNumber }
        });

        if (existingUser && existingUser.id !== userId) {
            return res.status(409).json({ 
                success: false, 
                message: 'Phone number already in use.' 
            });
        }

        // Get current user
        const user = await prisma.user.findUnique({
            where: { id: userId } // Use string userId
        });

        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: 'User not found.' 
            });
        }

        // Check if user is trying to set the same phone number
        if (user.phoneNumber === newPhoneNumber) {
            return res.status(400).json({ 
                success: false, 
                message: 'New phone number cannot be the same as current phone number.' 
            });
        }

        // Generate OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Clear any existing phone OTPs for this user
        await prisma.phoneOTP.deleteMany({ where: { userId } }); // Use string userId
        
        // Store OTP in database using PhoneOTP model
        await prisma.phoneOTP.create({
            data: {
                userId, // Use string userId
                otp: otp,
                expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
                type: 'PHONE_CHANGE',
                attempts: 0,
                isUsed: false,
                maxAttempts: 3
            }
        });

        // Store new phone number in user's resetToken field with prefix
        await prisma.user.update({
            where: { id: userId }, // Use string userId
            data: { resetToken: `PHONE_CHANGE:${newPhoneNumber}` }
        });

        // Send OTP via SMS
        await sendOTP(newPhoneNumber, otp, 'phone-change');

        return res.status(200).json({ 
            success: true, 
            message: 'OTP sent to new phone number successfully.' 
        });
    } catch (err) {
        console.error('requestPhoneChange error:', err);
        return res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
};

export const verifyPhoneChange = async (req, res) => {
    try {
        const userId = req.user.id;
        const { otp } = req.body;

        // Input validation
        if (!otp) {
            return res.status(400).json({ 
                success: false, 
                message: 'OTP is required.' 
            });
        }

        // Find the OTP record in PhoneOTP model
        const otpRecord = await prisma.phoneOTP.findFirst({
            where: {
                userId, // Use string userId
                otp: otp,
                type: 'PHONE_CHANGE',
                isUsed: false,
                expiresAt: {
                    gt: new Date()
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        if (!otpRecord) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid or expired OTP.' 
            });
        }

        // Get the user to retrieve the new phone number from resetToken
        const user = await prisma.user.findUnique({
            where: { id: userId } // Use string userId
        });

        if (!user || !user.resetToken || !user.resetToken.startsWith('PHONE_CHANGE:')) {
            return res.status(400).json({ 
                success: false, 
                message: 'Phone change session not found.' 
            });
        }

        const newPhoneNumber = user.resetToken.replace('PHONE_CHANGE:', '');

        // Check if the new phone number is still available
        const existingUser = await prisma.user.findUnique({
            where: { phoneNumber: newPhoneNumber }
        });

        if (existingUser && existingUser.id !== userId) {
            // Delete the OTP record and clear resetToken
            await prisma.$transaction([
                prisma.phoneOTP.update({
                    where: { id: otpRecord.id },
                    data: { isUsed: true }
                }),
                prisma.user.update({
                    where: { id: userId }, // Use string userId
                    data: { resetToken: null }
                })
            ]);

            return res.status(409).json({ 
                success: false, 
                message: 'Phone number is no longer available.' 
            });
        }

        // Update user's phone number, mark OTP as used, and clear resetToken
        await prisma.$transaction([
            prisma.user.update({
                where: { id: userId }, // Use string userId
                data: { 
                    phoneNumber: newPhoneNumber,
                    resetToken: null 
                }
            }),
            prisma.phoneOTP.update({
                where: { id: otpRecord.id },
                data: { isUsed: true }
            })
        ]);

        return res.status(200).json({ 
            success: true, 
            message: 'Phone number updated successfully.' 
        });
    } catch (err) {
        console.error('verifyPhoneChange error:', err);
        
        if (err.code === 'P2002') {
            return res.status(409).json({ 
                success: false, 
                message: 'Phone number already in use' 
            });
        }
        
        return res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
};

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

        // For security (email enumeration protection)
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
                .json({ message: "Email or phone number is required." });
        }

        const result = await checkUserExistenceService(emailOrPhone);

        return res.status(200).json(result);
    } catch (error) {
        console.error("Error in checkUserExistence:", error);
        return res.status(500).json({ message: "Internal server error." });
    }
};

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
            userId: isNewUser ? userId : undefined,
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
            : await findUserByEmail(emailOrPhone.trim().toLowerCase());

        if (!user) {
            return res.status(200).json({
                exists: false,
                loginMethods: ["otp"],
                requiresRegistration: true,
            });
        }

        const loginMethods = ["otp"];
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

export const sendEmailOTPToExisting = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Email is required.",
            });
        }

        const user = await findUserByEmail(email.trim().toLowerCase());
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found with this email address.",
            });
        }

        // Generate and send OTP
        const otp = String(Math.floor(100000 + Math.random() * 900000));
        await storeEmailOTP(user.id, otp);
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
        res.status(500).json({
            success: false,
            message: "Failed to send OTP",
        });
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

export const getUserProfile = async (req, res) => {
    try {
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized: No user ID found in token.",
            });
        }

        const user = await findUserById(userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found.",
            });
        }

        const userProfile = {
            id: user.id,
            name: user.name,
            username: user.username || "",
            fullName: user.fullName || "",
            email: user.email,
            phoneNumber: user.phoneNumber,
            emailVerified: user.emailVerified,
            phoneVerified: user.phoneVerified,
            isProfileComplete: user.isProfileComplete,
            country: user.country || "INDIA",
            state: user.state || "Punjab",
            zip: user.zip || "144410",
            dob: user.dob || null,
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

// ================================
// ADMIN USER MANAGEMENT CONTROLLERS
// ================================

/**
 * Get all users with filters, pagination, and stats (admin only)
 */
export const getAllUsers = async (req, res) => {
  try {
    const {
      search = '',
      role = '',
      status = '',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build where clause
    let where = {}; // Default to all users

    // Search filter
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { fullName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Role filter (comma-separated) - Uppercase for enum matching
    if (role) {
      const roles = role.split(',').map(r => r.trim().toUpperCase());
      where.role = { in: roles };
    }

    // Status filter (using existing fields) - Updated for blocked
    if (status) {
      const statuses = status.split(',').map(s => s.trim());
      where.AND = []; // Reset AND for status

      statuses.forEach(stat => {
        if (stat === 'pending') {
          where.AND.push({ emailVerified: false });
        } else if (stat === 'active') {
          where.AND.push({ 
            emailVerified: true, 
            isActive: true,
            isBlocked: false // ← ADD: Exclude blocked
          });
        } else if (stat === 'inactive') {
          where.AND.push({ 
            emailVerified: true, 
            isActive: false 
          });
        } else if (stat === 'blocked') { // ← ADD HANDLING
          where.AND.push({ isBlocked: true });
        }
      });
    }

    // Fetch all users - Include blocking fields
    const users = await prisma.user.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      select: {
        id: true,
        name: true,
        fullName: true,
        email: true,
        role: true,
        isActive: true,
        emailVerified: true,
        phoneVerified: true,
        phoneNumber: true,
        createdAt: true,
        updatedAt: true,
        isBlocked: true, // ← ADD
        blockedAt: true, // ← ADD
        blockedReason: true, // ← ADD
        blockedBy: true, // ← ADD
      }
    });

    // Map to include derived fields for frontend compatibility
    const mappedUsers = users.map(user => ({
      ...user,
      role: user.role.toLowerCase(), // Lowercase for frontend
      isBlocked: user.isBlocked || false, // ← FROM DB
      isEmailVerified: user.emailVerified,
      lastLoginAt: user.updatedAt // Use updatedAt as proxy for last login
    }));

    // Fetch total count for stats
    const total = await prisma.user.count({ where });

    // Compute stats (using DB fields) - Updated for blocked
    const totalUsers = await prisma.user.count();
    const activeCount = await prisma.user.count({ where: { emailVerified: true, isActive: true, isBlocked: false } }); // ← EXCLUDE BLOCKED
    const blockedCount = await prisma.user.count({ where: { isBlocked: true } }); // ← FROM DB, NOT HARDCODED
    const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } });
    const verifiedCount = await prisma.user.count({ where: { emailVerified: true } });

    const stats = {
      total: totalUsers,
      active: activeCount,
      blocked: blockedCount, // ← NOW DYNAMIC
      admins: adminCount,
      verified: verifiedCount
    };

    res.json({
      success: true,
      users: mappedUsers,
      stats,
      total
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load users'
    });
  }
};

/**
 * Sync users from dolchico website (placeholder - implement actual sync logic)
 */
export const syncUsersFromWebsite = async (req, res) => {
  try {
    const { action } = req.body;
    if (action !== 'sync-from-website') {
      return res.status(400).json({ success: false, message: 'Invalid action' });
    }

    // Placeholder: In a real implementation, fetch users from dolchico.com API or database.
    // For example, if dolchico has a public API: await fetch('https://dolchico.com/api/users', { headers: { Authorization: process.env.DOLCHICO_API_KEY } });
    // Then upsert into Prisma: await prisma.user.upsertMany(existingUsers);
    // Here, mock syncing 5 dummy users for demo.
    const dummyUsers = [
      { email: 'user1@dolchico.com', name: 'Dolchico User 1', role: 'USER' },
      { email: 'user2@dolchico.com', name: 'Dolchico User 2', role: 'USER' },
      // Add more...
    ];

    let syncedCount = 0;
    for (const userData of dummyUsers) {
      try {
        await createUser({
          ...userData,
          emailVerified: true,
          phoneVerified: false,
          isProfileComplete: true,
          isActive: true,
          isBlocked: false
        });
        syncedCount++;
      } catch (err) {
        // Skip duplicates
        if (err.code !== 'P2002') console.error('Sync error:', err);
      }
    }

    res.json({
      success: true,
      message: `Synced ${syncedCount} users from dolchico website.`
    });
  } catch (error) {
    console.error('Sync error:', error);
    res.status(500).json({
      success: false,
      message: 'Sync failed'
    });
  }
};

/**
 * Block a user (admin only)
 */
export const blockUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, duration } = req.body;

    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Blocking reason is required'
      });
    }

    const blockedUntil = duration ? new Date(Date.now() + parseInt(duration) * 24 * 60 * 60 * 1000) : null;

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        isBlocked: true,
        isActive: false,
        blockedAt: new Date(),
        blockedReason: reason.trim(),
        blockedBy: req.user.id, // Assume req.user from auth middleware
        blockedUntil
      },
      select: { id: true, isBlocked: true, isActive: true }
    });

    res.json({
      success: true,
      message: 'User blocked successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Error blocking user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to block user'
    });
  }
};

/**
 * Unblock a user (admin only)
 */
export const unblockUser = async (req, res) => {
  try {
    const { id } = req.params;

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        isBlocked: false,
        isActive: true,
        blockedAt: null,
        blockedReason: null,
        blockedBy: null,
        blockedUntil: null
      },
      select: { id: true, isBlocked: true, isActive: true }
    });

    res.json({
      success: true,
      message: 'User unblocked successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Error unblocking user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to unblock user'
    });
  }
};

/**
 * Delete a user (admin only) - Hard delete; consider soft delete for production
 */
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Optional: Delete related records (e.g., orders, reviews) in a transaction
    await prisma.$transaction(async (tx) => {
      // Example: Delete related data
      // await tx.order.deleteMany({ where: { userId: id } });
      // await tx.review.deleteMany({ where: { userId: id } });
      // await tx.wishlistItem.deleteMany({ where: { userId: id } });

      await tx.user.delete({
        where: { id }
      });
    });

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    if (error.code === 'P2025') { // Record not found
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Failed to delete user'
    });
  }
};

/**
 * Get single user by ID (admin only)
 */
export const getSingleUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    const user = await prisma.user.findUnique({
      where: { id },
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
        isActive: true,
        isBlocked: true,
        blockedAt: true,
        blockedReason: true,
        blockedBy: true,
        blockedUntil: true,
        country: true,
        state: true,
        zip: true,
        dob: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        // Optional: Add computed stats if needed (e.g., orders count)
        _count: {
          select: {
            orders: true,
            reviews: true,
          },
        },
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Compute derived fields for frontend (e.g., totalSpent from orders if needed)
    const totalOrders = user._count.orders || 0;
    const totalReviews = user._count.reviews || 0;
    // Add more computations as needed (e.g., sum orders for totalSpent)

    const userData = {
      ...user,
      role: user.role.toLowerCase(), // Lowercase for frontend
      isEmailVerified: user.emailVerified,
      totalOrders,
      totalReviews,
      // Add placeholders for stats if not computed
      totalSpent: 0, // Compute from orders if needed
      loyaltyPoints: 0,
      lastLoginAt: user.updatedAt, // Proxy
      lastActiveAt: user.updatedAt,
      tags: [], // If you have tags field
      phone: user.phoneNumber, // Alias for frontend
    };

    res.json({
      success: true,
      user: userData
    });
  } catch (error) {
    console.error('Error fetching single user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load user'
    });
  }
};

/**
 * Update single user by ID (admin only) - Partial updates
 */
export const updateSingleUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No update fields provided'
      });
    }

    // Remove sensitive fields (handle via dedicated endpoints)
    const {
      password,  // Use separate password reset
      email,     // Use email change flow
      phoneNumber, // Use phone change flow
      ...updateFields
    } = req.body;

    // Validate username if provided
    if (updateFields.username !== undefined) {
      if (updateFields.username && updateFields.username.length < 3) {
        return res.status(400).json({
          success: false,
          message: 'Username must be at least 3 characters long'
        });
      }
      if (updateFields.username) {
        const existingUsername = await prisma.user.findFirst({
          where: {
            username: updateFields.username.trim().toLowerCase(),
            NOT: { id }
          }
        });
        if (existingUsername) {
          return res.status(409).json({
            success: false,
            message: 'Username is already taken'
          });
        }
      }
    }

    // DOB validation if provided
    if (updateFields.dob !== undefined && updateFields.dob !== null && updateFields.dob !== '') {
      const date = new Date(updateFields.dob);
      if (isNaN(date.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid date of birth format. Use YYYY-MM-DD'
        });
      }
      updateFields.dob = date.toISOString();
    }

    // Clean data
    if (updateFields.email) updateFields.email = updateFields.email.trim().toLowerCase();
    if (updateFields.phoneNumber) updateFields.phoneNumber = updateFields.phoneNumber.trim();
    if (updateFields.username) updateFields.username = updateFields.username.trim().toLowerCase();
    if (updateFields.name) updateFields.name = updateFields.name.trim();
    if (updateFields.fullName) updateFields.fullName = updateFields.fullName.trim();

    // Uppercase role for enum
    if (updateFields.role) updateFields.role = updateFields.role.toUpperCase();

    // Update via service (handles allowed fields)
    const updatedUser = await updateProfile(id, updateFields);

    res.json({
      success: true,
      message: 'User updated successfully',
      user: updatedUser
    });
  } catch (err) {
    console.error('Error updating user:', err);
    let msg = err.message || 'Failed to update user';

    if (err.code === 'P2002') {
      const target = err.meta?.target;
      if (target?.includes('username')) msg = 'Username is already taken';
      else if (target?.includes('email')) msg = 'Email already exists';
      else if (target?.includes('phoneNumber')) msg = 'Phone number already exists';
      else msg = 'Field already exists';
    } else if (err.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.status(400).json({ success: false, message: msg });
  }
};