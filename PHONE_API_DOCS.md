# Phone Number API Documentation

## Overview
This document provides comprehensive documentation for all phone number-related authentication and account management APIs in the Dolchi Co system.

---

## 📱 Phone Number APIs

### Base URL
```
http://localhost:4000/api
```

### Authentication
Protected endpoints require JWT token:
```
Authorization: Bearer <your-jwt-token>
```

---

## 🔐 Password Management with Phone Number

### 1. Forgot Password (Phone Number)
**POST** `/user/forgot-password`

Send password reset OTP to phone number.

**Request Body:**
```json
{
  "emailOrPhone": "+916239562383"
}
```

**Response:**
```json
{
  "success": true,
  "message": "OTP sent successfully",
  "contactType": "phone"
}
```

**Features:**
- ✅ Auto-detects if input is phone number
- ✅ Validates phone number format
- ✅ Sends SMS with 6-digit OTP
- ✅ OTP expires in 10 minutes
- ✅ Rate limiting protection

**Example curl:**
```bash
curl -X POST http://localhost:4000/api/user/forgot-password \
-H "Content-Type: application/json" \
-d '{
  "emailOrPhone": "+916239562383"
}'
```

### 2. Reset Password (Phone Number)
**POST** `/user/reset-password`

Reset password using phone OTP verification.

**Request Body:**
```json
{
  "emailOrPhone": "+916239562383",
  "otp": "123456",
  "newPassword": "newSecurePassword123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password reset successful"
}
```

**Features:**
- ✅ Verifies OTP from phone number
- ✅ Updates password securely
- ✅ Invalidates used OTP
- ✅ Password strength validation

**Example curl:**
```bash
curl -X POST http://localhost:4000/api/user/reset-password \
-H "Content-Type: application/json" \
-d '{
  "emailOrPhone": "+916239562383",
  "otp": "123456",
  "newPassword": "Ak!sh274648"
}'
```

---

## 📞 Phone Number Change Management

### 3. Request Phone Number Change
**POST** `/user/request-phone-change`
🔒 **Protected Route**

Request to change user's phone number.

**Request Body:**
```json
{
  "newPhoneNumber": "+919876543210"
}
```

**Response:**
```json
{
  "success": true,
  "message": "OTP sent to new phone number successfully"
}
```

**Features:**
- ✅ Validates new phone number format
- ✅ Prevents duplicate phone numbers
- ✅ Prevents same number change
- ✅ Sends OTP to NEW phone number
- ✅ Stores change session securely

**Example curl:**
```bash
curl -X POST http://localhost:4000/api/user/request-phone-change \
-H "Content-Type: application/json" \
-H "Authorization: Bearer YOUR_JWT_TOKEN" \
-d '{
  "newPhoneNumber": "+919876543210"
}'
```

### 4. Verify Phone Number Change
**POST** `/user/verify-phone-change`
🔒 **Protected Route**

Verify phone number change with OTP.

**Request Body:**
```json
{
  "otp": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Phone number updated successfully"
}
```

**Features:**
- ✅ Verifies OTP from new phone number
- ✅ Updates user's phone number
- ✅ Clears change session
- ✅ Marks OTP as used
- ✅ Final availability check

**Example curl:**
```bash
curl -X POST http://localhost:4000/api/user/verify-phone-change \
-H "Content-Type: application/json" \
-H "Authorization: Bearer YOUR_JWT_TOKEN" \
-d '{
  "otp": "123456"
}'
```

---

## 🗑️ Account Deletion with Phone Number

### 5. Request Account Deletion
**POST** `/user/request-account-deletion`
🔒 **Protected Route**

Request account deletion with phone verification.

**Response:**
```json
{
  "success": true,
  "message": "OTP sent to registered phone for account deletion verification",
  "sentTo": ["phone"]
}
```

**Features:**
- ✅ Sends OTP to registered phone number
- ✅ Special warning SMS message
- ✅ Also sends to email if available
- ✅ Same OTP works for both channels
- ✅ 5-minute expiry

**Example curl:**
```bash
curl -X POST http://localhost:4000/api/user/request-account-deletion \
-H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 6. Verify Account Deletion
**POST** `/user/verify-account-deletion`
🔒 **Protected Route**

Verify and permanently delete account.

**Request Body:**
```json
{
  "otp": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Account deleted successfully"
}
```

**Features:**
- ✅ Accepts OTP from phone or email
- ✅ Permanent account deletion
- ✅ Cleans all user data
- ✅ Invalidates all sessions
- ✅ **IRREVERSIBLE ACTION**

**Example curl:**
```bash
curl -X POST http://localhost:4000/api/user/verify-account-deletion \
-H "Content-Type: application/json" \
-H "Authorization: Bearer YOUR_JWT_TOKEN" \
-d '{
  "otp": "123456"
}'
```

---

## 📋 SMS Message Templates

### Password Reset SMS
```
Your Dolchi Co password reset code is: 123456. Do not share this code with anyone.
```

### Phone Change SMS
```
Your Dolchi Co phone number change verification code is: 123456. Do not share this code with anyone.
```

### Account Deletion SMS
```
Your Dolchi Co account deletion verification code is: 123456. WARNING: This will permanently delete your account. Do not share this code.
```

---

## 🔄 Complete Workflow Examples

### Password Reset with Phone Number

```javascript
// Step 1: Request password reset
const forgotPasswordResponse = await fetch('/api/user/forgot-password', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    emailOrPhone: '+916239562383'
  })
});

// Step 2: User receives SMS with OTP
// Step 3: Reset password with OTP
const resetPasswordResponse = await fetch('/api/user/reset-password', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    emailOrPhone: '+916239562383',
    otp: '123456',
    newPassword: 'newSecurePassword123'
  })
});
```

### Phone Number Change Workflow

```javascript
// Step 1: Request phone number change
const requestChangeResponse = await fetch('/api/user/request-phone-change', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    newPhoneNumber: '+919876543210'
  })
});

// Step 2: User receives SMS on NEW phone number
// Step 3: Verify change with OTP
const verifyChangeResponse = await fetch('/api/user/verify-phone-change', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    otp: '123456'
  })
});

// Step 4: Phone number is updated
console.log('Phone number changed successfully!');
```

### Account Deletion Workflow

```javascript
// Step 1: Request account deletion
const requestDeletionResponse = await fetch('/api/user/request-account-deletion', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

// Step 2: User receives warning SMS
// Step 3: Confirm deletion with OTP
const confirmDeletionResponse = await fetch('/api/user/verify-account-deletion', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    otp: '123456'
  })
});

// Step 4: Account is permanently deleted
// Clear all local data
localStorage.removeItem('authToken');
sessionStorage.clear();
window.location.href = '/';
```

---

## ⚠️ Error Handling

### Common Error Responses

**Invalid Phone Number Format:**
```json
{
  "success": false,
  "message": "Invalid phone number format"
}
```

**Phone Number Already in Use:**
```json
{
  "success": false,
  "message": "Phone number already in use"
}
```

**Invalid or Expired OTP:**
```json
{
  "success": false,
  "message": "Invalid or expired OTP"
}
```

**Phone Number Not Found:**
```json
{
  "success": false,
  "message": "User with this phone number not found"
}
```

### Error Handling Example

```javascript
try {
  const response = await fetch('/api/user/request-phone-change', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      newPhoneNumber: '+919876543210'
    })
  });

  const result = await response.json();

  if (!result.success) {
    // Handle specific errors
    switch (result.message) {
      case 'Invalid phone number format':
        showError('Please enter a valid phone number');
        break;
      case 'Phone number already in use':
        showError('This phone number is already registered');
        break;
      case 'New phone number cannot be the same as current phone number':
        showError('Please enter a different phone number');
        break;
      default:
        showError('An error occurred. Please try again.');
    }
    return;
  }

  // Success handling
  showSuccess('OTP sent to your new phone number');
  startOTPCountdown();
  
} catch (error) {
  console.error('Network error:', error);
  showError('Network error. Please check your connection.');
}
```

---

## 📱 Phone Number Validation

### Supported Formats
- International format: `+916239562383`
- Country code required
- 10-13 digits after country code

### Validation Rules
```javascript
// Frontend validation example
function validatePhoneNumber(phoneNumber) {
  // Remove all spaces and special characters except +
  const cleaned = phoneNumber.replace(/[^\d+]/g, '');
  
  // Check if it starts with + and has 11-15 total characters
  const phoneRegex = /^\+[1-9]\d{10,14}$/;
  
  return phoneRegex.test(cleaned);
}

// Example usage
const isValid = validatePhoneNumber('+916239562383'); // true
const isInvalid = validatePhoneNumber('6239562383'); // false (no country code)
```

---

## 🔒 Security Features

### OTP Security
- ✅ 6-digit random numeric codes
- ✅ Cryptographically secure generation
- ✅ Time-limited expiry (5-10 minutes)
- ✅ Single-use tokens
- ✅ Rate limiting protection

### Phone Number Security
- ✅ Format validation
- ✅ Duplicate prevention
- ✅ Secure storage
- ✅ Change verification required
- ✅ Account ownership verification

### Account Deletion Security
- ✅ Multi-channel verification
- ✅ Warning messages
- ✅ Irreversible action confirmation
- ✅ Complete data cleanup
- ✅ Session invalidation

---

## 🛠️ Testing Guide

### Test Phone Numbers
For development/testing, you can use:
- `+916239562383` (your test number)
- Make sure Twilio account has SMS credits
- Test with valid phone numbers only

### Testing Checklist

**Password Reset:**
- [ ] Valid phone number accepts OTP
- [ ] Invalid phone number shows error
- [ ] Expired OTP shows error
- [ ] Used OTP shows error
- [ ] Password strength validation works

**Phone Change:**
- [ ] Same number rejected
- [ ] Duplicate number rejected
- [ ] Invalid format rejected
- [ ] OTP sent to NEW number
- [ ] Old number can't verify change

**Account Deletion:**
- [ ] OTP sent to registered phone
- [ ] Warning message received
- [ ] Account actually deleted
- [ ] All data cleaned up
- [ ] Sessions invalidated

---

## 📞 Support Information

### SMS Service Provider
- **Provider:** Twilio
- **Message Delivery:** Usually instant
- **Retry Logic:** Automatic for failed deliveries
- **Character Limit:** 160 characters per SMS

### Rate Limits
- **Password Reset:** 3 attempts per hour per phone
- **Phone Change:** 5 attempts per hour per user
- **Account Deletion:** 2 attempts per hour per user

### Troubleshooting
1. **SMS not received:**
   - Check phone number format
   - Verify Twilio credentials
   - Check SMS delivery logs

2. **OTP expired:**
   - Request new OTP
   - Complete action within time limit

3. **Phone number invalid:**
   - Use international format with country code
   - Ensure number is active and can receive SMS

---

**Last Updated:** September 10, 2025  
**API Version:** 1.0.0  
**Documentation:** Phone Number APIs  
**Server URL:** http://localhost:4000
