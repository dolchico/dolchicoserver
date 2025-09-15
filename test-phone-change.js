// Test script for phone change functionality
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000/api/user';

// Test phone change flow
async function testPhoneChange() {
    try {
        // You'll need to replace this with a valid JWT token from an authenticated user
        const authToken = 'YOUR_JWT_TOKEN_HERE';
        
        console.log('Testing phone change functionality...\n');

        // Test 1: Request phone change
        console.log('1. Testing request phone change...');
        const requestResponse = await fetch(`${BASE_URL}/request-phone-change`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
                newPhoneNumber: '+1234567890'  // Replace with test phone number
            })
        });

        const requestResult = await requestResponse.json();
        console.log('Request phone change response:', requestResult);

        if (requestResult.success) {
            console.log('✅ Phone change request sent successfully');
            
            // Test 2: Verify phone change (you'll need the actual OTP)
            console.log('\n2. Testing verify phone change...');
            const verifyResponse = await fetch(`${BASE_URL}/verify-phone-change`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({
                    otp: '123456'  // Replace with actual OTP received
                })
            });

            const verifyResult = await verifyResponse.json();
            console.log('Verify phone change response:', verifyResult);

            if (verifyResult.success) {
                console.log('✅ Phone change verified successfully');
            } else {
                console.log('❌ Phone change verification failed');
            }
        } else {
            console.log('❌ Phone change request failed');
        }

    } catch (error) {
        console.error('Error testing phone change:', error);
    }
}

// Instructions for manual testing
console.log(`
=== Phone Change Testing Instructions ===

1. Start your server: npm start
2. Authenticate a user and get their JWT token
3. Replace 'YOUR_JWT_TOKEN_HERE' with the actual token
4. Replace '+1234567890' with a test phone number
5. Run this script: node test-phone-change.js
6. Check your phone for the OTP
7. Replace '123456' with the actual OTP and run the verify test

API Endpoints:
- POST /api/user/request-phone-change
  Body: { "newPhoneNumber": "+1234567890" }
  Headers: { "Authorization": "Bearer <token>" }

- POST /api/user/verify-phone-change  
  Body: { "otp": "123456" }
  Headers: { "Authorization": "Bearer <token>" }
`);

// Uncomment the line below to run the test (after adding your JWT token)
// testPhoneChange();
