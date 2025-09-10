// services/tokenService.js
import prisma from "../lib/prisma.js";
import crypto from "crypto";

const EXP_MS = 24 * 60 * 60 * 1000; // 24h

export function hashToken(raw) {
    return crypto.createHash("sha256").update(raw, "utf8").digest("hex");
}

export async function createEmailVerificationToken(userId) {
    const rawToken = crypto.randomBytes(32).toString("base64url"); // URL-safe
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + EXP_MS);

    // Invalidate previous tokens
    await prisma.emailVerificationToken.deleteMany({ where: { userId } });

    await prisma.emailVerificationToken.create({
        data: {
            token: tokenHash,
            userId,
            expiresAt,
            usedAt: null,
        },
    });

    console.log("Token created and stored in database");

    // return the raw token to email
    return rawToken;
}

export async function findEmailVerificationToken(rawToken) {
    const tokenHash = hashToken(rawToken);

    const result = await prisma.emailVerificationToken.findUnique({
        where: { token: tokenHash }, // token field must be @unique
    });

    return result;
}

export async function deleteEmailVerificationToken(rawToken) {
    const tokenHash = hashToken(rawToken);
    return prisma.emailVerificationToken.delete({
        where: { token: tokenHash },
    });
}

export async function markEmailTokenUsed(rawToken) {
    const tokenHash = hashToken(rawToken);
    return prisma.emailVerificationToken.update({
        where: { token: tokenHash },
        data: { usedAt: new Date() },
    });
}
