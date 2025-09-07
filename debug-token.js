// debug-token.js - Quick token debugging script
import { PrismaClient } from '@prisma/client';
import { findEmailVerificationToken } from './services/tokenService.js';
import crypto from 'crypto';

const prisma = new PrismaClient();

function hashToken(raw) {
  return crypto.createHash('sha256').update(raw, 'utf8').digest('hex');
}

async function debugToken() {
  const testToken = "AuV4LYl2aoq_FDJpof-RYJ1Tygt5WDyf2jpTxTZ-9sE";
  
  console.log('=== TOKEN DEBUG ===');
  console.log('Test token:', testToken);
  console.log('Token length:', testToken.length);
  console.log('URL encoded version:', encodeURIComponent(testToken));
  console.log('URL decoded version:', decodeURIComponent(testToken));
  
  // Test different hash variations
  console.log('\n=== HASH TESTS ===');
  console.log('Hash of original:', hashToken(testToken).substring(0, 20) + '...');
  console.log('Hash of URL encoded:', hashToken(encodeURIComponent(testToken)).substring(0, 20) + '...');
  console.log('Hash of URL decoded:', hashToken(decodeURIComponent(testToken)).substring(0, 20) + '...');
  
  // Check all tokens in the database
  const allTokens = await prisma.emailVerificationToken.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  
  console.log('\n=== DATABASE TOKENS ===');
  console.log('Found', allTokens.length, 'tokens in database:');
  allTokens.forEach((token, idx) => {
    console.log(`${idx + 1}. Token (first 20 chars): ${token.token.substring(0, 20)}...`);
    console.log(`   User ID: ${token.userId}`);
    console.log(`   Expires: ${token.expiresAt}`);
    console.log(`   Used: ${token.usedAt || 'Not used'}`);
    console.log(`   Created: ${token.createdAt}`);
    console.log('');
  });
  
  // Try to find the token using our service
  console.log('=== TOKEN LOOKUP TESTS ===');
  const variations = [
    testToken,
    encodeURIComponent(testToken),
    decodeURIComponent(testToken)
  ];
  
  for (let i = 0; i < variations.length; i++) {
    const variant = variations[i];
    console.log(`\nTesting variant ${i + 1}: ${variant.substring(0, 20)}...`);
    try {
      const foundToken = await findEmailVerificationToken(variant);
      console.log('Token found via service:', !!foundToken);
      if (foundToken) {
        console.log('Found token details:', foundToken);
        break; // Found it!
      }
    } catch (error) {
      console.error('Error finding token:', error.message);
    }
  }
  
  await prisma.$disconnect();
}

debugToken().catch(console.error);
