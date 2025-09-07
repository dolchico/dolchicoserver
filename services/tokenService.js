// services/tokenService.js
import prisma from '../lib/prisma.js';
import crypto from 'crypto';

const EXP_MS = 24 * 60 * 60 * 1000; // 24h

export function hashToken(raw) {
  return crypto.createHash('sha256').update(raw, 'utf8').digest('hex');
}

export async function createEmailVerificationToken(userId) {
  const rawToken = crypto.randomBytes(32).toString('base64url'); // URL-safe
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + EXP_MS);

  console.log('=== TOKEN CREATION DEBUG ===');
  console.log('Creating token for userId:', userId);
  console.log('Raw token (first 10 chars):', rawToken.substring(0, 10) + '...');
  console.log('Token hash (first 10 chars):', tokenHash.substring(0, 10) + '...');
  console.log('Token expires at:', expiresAt);

  // Invalidate previous tokens
  await prisma.emailVerificationToken.deleteMany({ where: { userId } });

  await prisma.emailVerificationToken.create({
    data: {
      token: tokenHash,
      userId,
      expiresAt,
      usedAt: null
    },
  });

  console.log('Token created and stored in database');

  // return the raw token to email
  return rawToken;
}

export async function findEmailVerificationToken(rawToken) {
  console.log('=== TOKEN LOOKUP DEBUG ===');
  console.log('Looking up token (first 10 chars):', rawToken.substring(0, 10) + '...');
  
  const tokenHash = hashToken(rawToken);
  console.log('Hashed token (first 10 chars):', tokenHash.substring(0, 10) + '...');
  
  const result = await prisma.emailVerificationToken.findUnique({
    where: { token: tokenHash }, // token field must be @unique
  });
  
  console.log('Token found in database:', !!result);
  if (result) {
    console.log('Token details:', {
      userId: result.userId,
      expiresAt: result.expiresAt,
      usedAt: result.usedAt
    });
  }
  
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
