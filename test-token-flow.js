// test-token-flow.js - Test complete token generation and verification flow
import { PrismaClient } from '@prisma/client';
import { createEmailVerificationToken, findEmailVerificationToken } from './services/tokenService.js';

const prisma = new PrismaClient();

async function testTokenFlow() {
  console.log('=== TESTING COMPLETE TOKEN FLOW ===');
  
  // Step 1: Create a test user (or use existing)
  let testUser;
  try {
    testUser = await prisma.user.findFirst({
      where: { email: { contains: '@' } },
      orderBy: { createdAt: 'desc' }
    });
    
    if (!testUser) {
      // Create a test user
      testUser = await prisma.user.create({
        data: {
          email: 'test@example.com',
          name: 'Test User',
          emailVerified: false,
          phoneVerified: false,
          isProfileComplete: false,
          role: 'USER'
        }
      });
      console.log('Created test user:', testUser.id);
    } else {
      console.log('Using existing user:', testUser.id, testUser.email);
    }
  } catch (error) {
    console.error('Error with test user:', error);
    return;
  }
  
  // Step 2: Generate a fresh token
  console.log('\n=== STEP 1: GENERATE TOKEN ===');
  const rawToken = await createEmailVerificationToken(testUser.id);
  console.log('Generated raw token:', rawToken);
  
  // Step 3: Immediately try to verify the token
  console.log('\n=== STEP 2: VERIFY TOKEN ===');
  const foundToken = await findEmailVerificationToken(rawToken);
  console.log('Token verification result:', !!foundToken);
  
  if (foundToken) {
    console.log('✅ SUCCESS! Token flow is working correctly');
    console.log('Token details:', {
      userId: foundToken.userId,
      expiresAt: foundToken.expiresAt,
      usedAt: foundToken.usedAt
    });
    
    // Step 4: Test the actual controller
    console.log('\n=== STEP 3: TEST CONTROLLER SIMULATION ===');
    console.log('You can now test with this token in your frontend:');
    console.log('POST /api/user/verify-email');
    console.log('Body: { "token": "' + rawToken + '" }');
    
  } else {
    console.log('❌ FAILED! Token was not found after creation');
  }
  
  await prisma.$disconnect();
}

testTokenFlow().catch(console.error);
