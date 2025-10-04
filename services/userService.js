import prisma from "../lib/prisma.js";
import { createEmailVerificationToken } from "./tokenService.js";
import { sendVerificationEmail } from "./mailService.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken"; // Added for verifyUserEmailToken

/**
 * Create a new user
 * @param {object} userData - User data
 * @returns {Promise<object>} Created user
 */
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
            role: cleanUserData.role || "USER",
            emailVerified: cleanUserData.emailVerified ?? false,
            phoneVerified: cleanUserData.phoneVerified ?? false,
            isProfileComplete: cleanUserData.isProfileComplete ?? false,
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
                updatedAt: true,
            },
        });

        console.log("User created successfully:", {
            id: newUser.id,
            email: newUser.email,
            phoneNumber: newUser.phoneNumber,
        });

        return newUser;
    } catch (error) {
        console.error("Error creating user:", error);

        if (error.code === "P2002") {
            const field = error.meta?.target?.[0] || "field";
            throw new Error(
                `${field === "email" ? "Email" : "Phone number"} already exists`
            );
        }

        throw new Error("Failed to create user: " + error.message);
    }
};

/**
 * Find user by email
 * @param {string} email - User email
 * @returns {Promise<object|null>} User object or null
 */
export const findUserByEmail = async (email) => {
    if (!email) return null;
    return prisma.user.findUnique({
        where: { email: email.trim().toLowerCase() },
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
            password: true,
            role: true,
            createdAt: true,
            updatedAt: true,
            country: true,
            state: true,
            zip: true,
            dob: true,
            resetToken: true,
            pendingEmail: true,
            pendingEmailOtp: true,
            pendingEmailExpiry: true,
        },
    });
};

/**
 * Find user by phone number
 * @param {string} phoneNumber - User phone number
 * @returns {Promise<object|null>} User object or null
 */
export const findUserByPhone = async (phoneNumber) => {
    if (!phoneNumber) return null;
    return prisma.user.findUnique({
        where: { phoneNumber: phoneNumber.trim() },
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
            password: true,
            role: true,
            createdAt: true,
            updatedAt: true,
            country: true,
            state: true,
            zip: true,
            dob: true,
            resetToken: true,
        },
    });
};

/**
 * Find user by ID
 * @param {string} id - User ID
 * @returns {Promise<object|null>} User object or null
 */
export const findUserById = async (id) => {
    if (!id) return null;

    return prisma.user.findUnique({
        where: { id }, // Use string id
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
            dob: true,
            role: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
            resetToken: true,
            pendingEmail: true,
            pendingEmailOtp: true,
            pendingEmailExpiry: true,
        },
    });
};

/**
 * Update user's emailVerified status
 * @param {string} userId - User ID
 * @returns {Promise<object>} Updated user
 */
export const verifyUserEmail = async (userId) => {
    if (!userId) throw new Error("userId is required");
    try {
        return await prisma.user.update({
            where: { id: userId }, // Use string userId directly
            data: { emailVerified: true },
            select: {
                id: true,
                name: true,
                email: true,
                phoneNumber: true,
                emailVerified: true,
                phoneVerified: true,
                isProfileComplete: true,
                password: true,
                role: true,
            },
        });
    } catch (error) {
        console.error("Error verifying user email:", error);
        throw error;
    }
};

/**
 * Update user's phoneVerified status
 * @param {string} userId - User ID
 * @returns {Promise<object>} Updated user
 */
export const verifyUserPhone = async (userId) => {
    if (!userId) throw new Error("userId is required");
    try {
        return await prisma.user.update({
            where: { id: userId }, // Use string userId directly
            data: { phoneVerified: true },
            select: {
                id: true,
                name: true,
                email: true,
                phoneNumber: true,
                emailVerified: true,
                phoneVerified: true,
                isProfileComplete: true,
                password: true,
                role: true,
            },
        });
    } catch (error) {
        console.error("Error verifying user phone:", error);
        throw error;
    }
};

/**
 * Update user profile with allowed fields
 * @param {string} userId - User ID
 * @param {object} updateData - Update data
 * @returns {Promise<object>} Updated user
 */
export const updateProfile = async (userId, updateData) => {
    const allowedFields = [
        "name",
        "username",
        "fullName",
        "email",
        "phoneNumber",
        "country",
        "state",
        "zip",
        "emailVerified",
        "phoneVerified",
        "isProfileComplete",
        "dob",
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
    if (data.dob) {
        data.dob = new Date(data.dob);
        if (isNaN(data.dob.getTime())) {
            throw new Error("Invalid date of birth format. Use YYYY-MM-DD.");
        }
    }

    if (Object.keys(data).length === 0) {
        throw new Error("No fields provided for update.");
    }

    try {
        return await prisma.user.update({
            where: { id: userId }, // Use string userId
            data: {
                ...data,
                updatedAt: new Date(),
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
                dob: true,
                role: true,
                createdAt: true,
                updatedAt: true,
            },
        });
    } catch (err) {
        if (err.code === "P2002") {
            const target = err.meta?.target;
            if (target?.includes("username")) {
                throw new Error("Username already exists.");
            }
            if (target?.includes("email")) {
                throw new Error("Email already exists.");
            }
            if (target?.includes("phoneNumber")) {
                throw new Error("Phone number already exists.");
            }
            throw new Error("This information already exists.");
        }
        throw err;
    }
};

/**
 * Check user existence by email or phone
 * @param {string} emailOrPhone - Email or phone number
 * @returns {Promise<object>} Existence result
 */
export const checkUserExistenceService = async (emailOrPhone) => {
    try {
        const isPhone = /^\+?\d+$/.test(emailOrPhone.trim());

        const user = isPhone
            ? await findUserByPhone(emailOrPhone.trim())
            : await findUserByEmail(emailOrPhone.trim().toLowerCase());

        if (!user) {
            return {
                exists: false,
                loginMethods: ["otp"],
                requiresRegistration: true,
            };
        }

        const loginMethods = ["otp"];
        const hasVerifiedContact = isPhone
            ? user.phoneVerified
            : user.emailVerified;

        if (hasVerifiedContact && user.password) {
            loginMethods.push("password");
        }

        return {
            exists: true,
            loginMethods,
            userRole: user.role,
            isProfileComplete: user.isProfileComplete,
            requiresRegistration: false,
        };
    } catch (error) {
        console.error("Error in checkUserExistenceService:", error);
        throw new Error("Failed to check user existence");
    }
};

/**
 * Resend email verification
 * @param {string} email - User email
 * @returns {Promise<object>} Result
 */
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
                where: { userId: user.id },
            });

            const newToken = await createEmailVerificationToken(user.id);
            await sendVerificationEmail(
                user.email,
                newToken,
                null,
                user.name || "User"
            );
        });

        return { success: true, userFound: true, alreadyVerified: false };
    } catch (error) {
        console.error("Error in resendEmailVerificationService:", error);
        throw error;
    }
};

/**
 * Determine auth flow
 * @param {string} phoneNumber - Phone number
 * @returns {Promise<object>} Auth flow result
 */
export const determineAuthFlow = async (phoneNumber) => {
    const cleanPhone = phoneNumber.trim();

    try {
        const user = await findUserByPhone(cleanPhone);

        if (!user) {
            return { flowType: "signup", user: null };
        } else if (user.phoneVerified && user.isProfileComplete) {
            return { flowType: "signin", user };
        } else {
            return { flowType: "signup", user };
        }
    } catch (error) {
        console.error("Error determining auth flow:", error);
        throw new Error("Failed to determine authentication flow");
    }
};

/**
 * Find or create user
 * @param {string} phoneNumber - Phone number
 * @returns {Promise<object>} User object
 */
export const findOrCreateUser = async (phoneNumber) => {
    const cleanPhone = phoneNumber.trim();

    try {
        let user = await findUserByPhone(cleanPhone);

        if (!user) {
            user = await createUser({
                phoneNumber: cleanPhone,
            });

            console.log(
                "Created new user for phone:",
                cleanPhone,
                "with ID:",
                user.id
            );
        }

        return user;
    } catch (error) {
        console.error("Error in findOrCreateUser:", error);

        if (error.code === "P2002") {
            throw new Error("Phone number already exists with another account");
        }

        throw new Error("Failed to create or find user");
    }
};

/**
 * Update profile completion
 * @param {string} userId - User ID
 * @param {object} profileData - Profile data
 * @returns {Promise<object>} Updated user
 */
export const updateProfileCompletion = async (userId, profileData) => {
    const { name, email, password } = profileData;

    try {
        const updateData = {
            name: name.trim(),
            phoneVerified: true,
            isProfileComplete: true,
        };

        if (email && email.trim()) {
            updateData.email = email.trim().toLowerCase();

            const existingEmailUser = await prisma.user.findUnique({
                where: { email: updateData.email },
            });

            if (existingEmailUser && existingEmailUser.id !== userId) {
                throw new Error(
                    "Email address is already registered with another account"
                );
            }
        }

        if (password && password.trim()) {
            const saltRounds = 12;
            updateData.password = await bcrypt.hash(
                password.trim(),
                saltRounds
            );
        }

        const updatedUser = await prisma.user.update({
            where: { id: userId }, // Use string userId
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
                updatedAt: true,
            },
        });

        console.log("Profile completed for user:", userId);
        return updatedUser;
    } catch (error) {
        console.error("Error updating profile completion:", error);

        if (error.code === "P2002") {
            throw new Error("Email address is already registered");
        }

        throw error;
    }
};

/**
 * Get user auth status
 * @param {string} userId - User ID
 * @returns {Promise<object>} User auth status
 */
export const getUserAuthStatus = async (userId) => {
    try {
        if (!userId) {
            throw new Error("User ID is required");
        }

        const user = await prisma.user.findUnique({
            where: { id: userId }, // Use string userId
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
                updatedAt: true,
            },
        });

        if (!user) {
            throw new Error("User not found");
        }

        return {
            ...user,
            isLocked: false,
            lockedUntil: null,
        };
    } catch (error) {
        console.error("Error getting user auth status:", error);
        throw error;
    }
};

/**
 * Send email verification
 * @param {string} userId - User ID
 * @param {string} email - User email
 * @param {string} userName - User name
 * @param {string|null} otp - OTP code
 * @returns {Promise<object>} Result
 */
export const sendEmailVerification = async (userId, email, userName, otp = null) => {
    const token = await createEmailVerificationToken(userId);
    await sendVerificationEmail(email, token, otp, userName || "User");
    return { success: true };
};

/**
 * Clean up expired tokens
 * @returns {Promise<object>} Result
 */
export const cleanupExpiredTokens = async () => {
    try {
        const result = await prisma.emailVerificationToken.deleteMany({
            where: {
                expiresAt: {
                    lt: new Date(),
                },
            },
        });
        return { success: true, deletedCount: result.count };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

/**
 * Verify user email token
 * @param {string} token - Verification token
 * @returns {Promise<object>} Result
 */
export const verifyUserEmailToken = async (token) => {
    try {
        const verificationToken = await prisma.emailVerificationToken.findUnique({
            where: { token },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        emailVerified: true,
                        phoneVerified: true,
                        isProfileComplete: true,
                        role: true,
                    },
                },
            },
        });

        if (!verificationToken) {
            return {
                success: false,
                error: "TOKEN_NOT_FOUND",
            };
        }

        if (verificationToken.expiresAt < new Date()) {
            return {
                success: false,
                error: "TOKEN_EXPIRED",
            };
        }

        if (verificationToken.usedAt) {
            return {
                success: false,
                error: "TOKEN_ALREADY_USED",
            };
        }

        const result = await prisma.$transaction(async (tx) => {
            const updatedUser = await tx.user.update({
                where: { id: verificationToken.userId }, // Use string userId
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

            await tx.emailVerificationToken.update({
                where: { id: verificationToken.id },
                data: { usedAt: new Date() },
            });

            return updatedUser;
        });

        const authToken = jwt.sign(
            {
                userId: result.id,
                email: result.email,
                role: result.role,
            },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        const requiresProfileCompletion = !result.isProfileComplete;

        return {
            success: true,
            user: result,
            authToken: authToken,
            requiresProfileCompletion: requiresProfileCompletion,
            nextStep: requiresProfileCompletion
                ? "profile-completion"
                : "dashboard",
        };
    } catch (error) {
        console.error("Database error in verifyUserEmailToken:", error);
        return {
            success: false,
            error: "DATABASE_ERROR",
            details: error.message,
        };
    }
};