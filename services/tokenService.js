import prisma from "../lib/prisma.js";
import crypto from "crypto";

const EXP_MS = 24 * 60 * 60 * 1000; // 24h

/**
 * Hashes a raw token using SHA-256.
 * @param {string} raw - The raw token to hash
 * @returns {string} The hashed token
 * @throws {Error} If raw token is invalid
 */
export function hashToken(raw) {
  try {
    // Validate input
    if (!raw || typeof raw !== "string") {
      throw new Error("Invalid raw token");
    }

    return crypto.createHash("sha256").update(raw, "utf8").digest("hex");
  } catch (error) {
    console.error("Error hashing token:", error);
    throw new Error(`Failed to hash token: ${error.message}`);
  }
}

/**
 * Creates an email verification token for a user.
 * @param {string} userId - The ID of the user (UUID)
 * @returns {Promise<string>} The raw token to be sent via email
 * @throws {Error} If userId is invalid or database operation fails
 */
export async function createEmailVerificationToken(userId) {
  try {
    // Validate userId
    if (!userId || typeof userId !== "string") {
      throw new Error("Invalid user ID");
    }

    // Check database connection
    if (!prisma) {
      throw new Error("Database connection not available");
    }

    const rawToken = crypto.randomBytes(32).toString("base64url");
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + EXP_MS);

    // Invalidate previous tokens
    await prisma.emailVerificationToken.deleteMany({
      where: { userId }, // Use string userId
    });

    // Create new token
    await prisma.emailVerificationToken.create({
      data: {
        token: tokenHash,
        userId, // Use string userId
        expiresAt,
        usedAt: null,
      },
    });

    console.log("Token created and stored in database for user:", userId);

    return rawToken;
  } catch (error) {
    console.error("Error creating email verification token:", error);
    throw new Error(`Failed to create email verification token: ${error.message}`);
  }
}

/**
 * Finds an email verification token by its raw value.
 * @param {string} rawToken - The raw token to find
 * @returns {Promise<Object|null>} The token record or null if not found
 * @throws {Error} If rawToken is invalid or query fails
 */
export async function findEmailVerificationToken(rawToken) {
  try {
    // Validate rawToken
    if (!rawToken || typeof rawToken !== "string") {
      throw new Error("Invalid raw token");
    }

    // Check database connection
    if (!prisma) {
      throw new Error("Database connection not available");
    }

    const tokenHash = hashToken(rawToken);
    const result = await prisma.emailVerificationToken.findUnique({
      where: { token: tokenHash },
    });

    return result;
  } catch (error) {
    console.error("Error finding email verification token:", error);
    throw new Error(`Failed to find email verification token: ${error.message}`);
  }
}

/**
 * Deletes an email verification token by its raw value.
 * @param {string} rawToken - The raw token to delete
 * @returns {Promise<Object>} The deleted token record
 * @throws {Error} If rawToken is invalid or token not found
 */
export async function deleteEmailVerificationToken(rawToken) {
  try {
    // Validate rawToken
    if (!rawToken || typeof rawToken !== "string") {
      throw new Error("Invalid raw token");
    }

    // Check database connection
    if (!prisma) {
      throw new Error("Database connection not available");
    }

    const tokenHash = hashToken(rawToken);
    const result = await prisma.emailVerificationToken.delete({
      where: { token: tokenHash },
    });

    return result;
  } catch (error) {
    console.error("Error deleting email verification token:", error);
    throw new Error(`Failed to delete email verification token: ${error.message}`);
  }
}

/**
 * Marks an email verification token as used.
 * @param {string} rawToken - The raw token to mark as used
 * @returns {Promise<Object>} The updated token record
 * @throws {Error} If rawToken is invalid or token not found
 */
export async function markEmailTokenUsed(rawToken) {
  try {
    // Validate rawToken
    if (!rawToken || typeof rawToken !== "string") {
      throw new Error("Invalid raw token");
    }

    // Check database connection
    if (!prisma) {
      throw new Error("Database connection not available");
    }

    const tokenHash = hashToken(rawToken);
    const result = await prisma.emailVerificationToken.update({
      where: { token: tokenHash },
      data: { usedAt: new Date() },
    });

    return result;
  } catch (error) {
    console.error("Error marking email token as used:", error);
    throw new Error(`Failed to mark email token as used: ${error.message}`);
  }
}