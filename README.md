# Dolchi Co API Documentation

## Base URL
```
http://localhost:4000/api
```

## Authentication
All protected endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

---

## 📋 Table of Contents

1. [Authentication Endpoints](#authentication-endpoints)
2. [User Management Endpoints](#user-management-endpoints)
3. [Profile Management](#profile-management)
4. [Contact Change Management](#contact-change-management)
5. [OAuth Authentication](#oauth-authentication)
6. [Response Format](#response-format)
7. [Error Codes](#error-codes)

---

## 🔐 Authentication Endpoints

### 1. User Registration
**POST** `/user/register`

Register a new user with email or phone number.

**Request Body:**
```json
{
  "email": "user@example.com",      // Optional if phone provided
  "phoneNumber": "+916239562383",   // Optional if email provided
  "password": "securePassword123",  // Optional for OTP-based registration
  "name": "John Doe"               // Optional
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "user@example.com",
    "phoneNumber": "+916239562383",
    "emailVerified": false,
    "phoneVerified": false,
    "isProfileComplete": false
  }
}
```

### 2. User Login
**POST** `/user/login`

Login with email, phone number, or password.

**Request Body:**
```json
{
  "email": "user@example.com",         // Use this OR phoneNumber
  "phoneNumber": "+916239562383",      // Use this OR email
  "password": "securePassword123"      // Required for password login
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "user@example.com",
    "phoneNumber": "+916239562383",
    "emailVerified": true,
    "phoneVerified": true,
    "isProfileComplete": true
  }
}
```

### 3. Forgot Password
**POST** `/user/forgot-password`

Send password reset OTP to email or phone.

**Request Body:**
```json
{
  "emailOrPhone": "user@example.com"  // Can be email or phone number
}
```

**Response:**
```json
{
  "success": true,
  "message": "OTP sent successfully",
  "contactType": "email"  // or "phone"
}
```

### 4. Reset Password
**POST** `/user/reset-password`

Reset password using OTP verification.

**Request Body:**
```json
{
  "emailOrPhone": "user@example.com",
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

---

## 👤 User Management Endpoints

### 5. Complete Profile
**POST** `/user/complete-profile`
🔒 **Protected Route**

Complete user profile after registration.

**Request Body:**
```json
{
  "name": "John Doe",
  "username": "johndoe123",    // Optional
  "country": "India",          // Optional
  "state": "Delhi",           // Optional
  "zip": "110001"             // Optional
}
```

**Response:**
```json
{
  "success": true,
  "message": "Profile completed successfully",
  "user": {
    "id": 1,
    "name": "John Doe",
    "username": "johndoe123",
    "email": "user@example.com",
    "phoneNumber": "+916239562383",
    "country": "India",
    "state": "Delhi",
    "zip": "110001",
    "isProfileComplete": true
  }
}
```

### 6. Update Profile
**PUT** `/user/profile`
🔒 **Protected Route**

Update user profile information.

**Request Body:**
```json
{
  "name": "John Smith",
  "username": "johnsmith123",
  "country": "USA",
  "state": "California",
  "zip": "90210"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "user": {
    "id": 1,
    "name": "John Smith",
    "username": "johnsmith123",
    "email": "user@example.com",
    "phoneNumber": "+916239562383",
    "country": "USA",
    "state": "California",
    "zip": "90210"
  }
}
```

### 7. Get User Profile
**GET** `/user/profile`
🔒 **Protected Route**

Get current user's profile information.

**Response:**
```json
{
  "success": true,
  "user": {
    "id": 1,
    "name": "John Doe",
    "username": "johndoe123",
    "email": "user@example.com",
    "phoneNumber": "+916239562383",
    "country": "India",
    "state": "Delhi",
    "zip": "110001",
    "emailVerified": true,
    "phoneVerified": true,
    "isProfileComplete": true,
    "role": "USER",
    "createdAt": "2025-01-01T00:00:00.000Z"
  }
}
```

---

## 📞 Contact Change Management

### 8. Request Email Change
**POST** `/user/request-email-change`
🔒 **Protected Route**

Request to change user's email address.

**Request Body:**
```json
{
  "newEmail": "newemail@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "OTP sent to new email address"
}
```

### 9. Verify Email Change
**POST** `/user/verify-email-change`
🔒 **Protected Route**

Verify email change with OTP.

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
  "message": "Email updated successfully"
}
```

### 10. Request Phone Change
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

### 11. Verify Phone Change
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

---

## 📧 OTP and Verification Endpoints

### 12. Send Email OTP
**POST** `/user/send-email-otp`

Send OTP to existing user's email.

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "OTP sent to email successfully"
}
```

### 13. Send Phone OTP
**POST** `/user/send-phone-otp`

Send OTP to existing user's phone.

**Request Body:**
```json
{
  "phoneNumber": "+916239562383"
}
```

**Response:**
```json
{
  "success": true,
  "message": "OTP sent to phone successfully"
}
```

### 14. Verify Email OTP
**POST** `/user/verify-email-otp`

Verify email OTP during registration/verification.

**Request Body:**
```json
{
  "email": "user@example.com",
  "otp": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Email verified successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 15. Verify Phone OTP
**POST** `/user/verify-phone-otp`

Verify phone OTP during registration/verification.

**Request Body:**
```json
{
  "phoneNumber": "+916239562383",
  "otp": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Phone verified successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 16. Resend Verification Email
**POST** `/user/resend-verification`

Resend email verification link.

---

## Consolidated API Docs (Coupons, Payments, Reviews)

### Coupon API Integration Guide

Base paths used by this project (router is mounted at `/api`):
- Admin operations: POST /api/admin/coupons
- Public/Cart operations: POST /api/coupons/validate, POST /api/cart/apply-coupon, DELETE /api/cart/remove-coupon/:cartId

Endpoints

1) Create coupon (Admin)
- POST /api/admin/coupons
- Body (example):
```json
{
  "code": "SUMMER20",
  "name": "Summer Sale 2025",
  "type": "PERCENTAGE",
  "discountValue": "20",
  "minOrderValue": "100.00",
  "maxDiscountAmount": "50.00",
  "usageLimitTotal": 1000,
  "usageLimitPerUser": 2,
  "validFrom": "2025-09-01T00:00:00.000Z",
  "validUntil": "2025-10-01T00:00:00.000Z",
  "isActive": true,
  "isNewUserOnly": false,
  "categoryIds": [1,2,3]
}
```
- Success: 201 Created with coupon object

2) Validate coupon
- POST /api/coupons/validate
- Body (example):
```json
{
  "userId": 123,
  "code": "SUMMER20",
  "cartTotal": "150.00",
  "categoryIds": [1]
}
```
- Success: { valid: true, discount: "30.00" }
- Possible error reasons: NOT_FOUND, INACTIVE, NOT_STARTED, EXPIRED, MIN_ORDER_NOT_MET, CATEGORY_MISMATCH, USAGE_LIMIT_EXCEEDED, USER_USAGE_LIMIT_EXCEEDED

3) Apply coupon (reserve usage)
- POST /api/cart/apply-coupon
- Body (example):
```json
{
  "userId": 123,
  "cartId": 456,
  "code": "SUMMER20"
}
```
- Success: { reservedUsageId: 42, couponId: 7 }
- The call reserves a CouponUsage row (orderId=null) inside a transaction to avoid races.

4) Remove coupon from cart
- DELETE /api/cart/remove-coupon/:cartId
- Success: { removed: true }

Flow notes
- Frontend should call validate when the user enters a coupon code to show immediate feedback.
- When applying a coupon to the cart, call apply endpoint to reserve usage; if user proceeds to payment, Order service should link reserved usage to the created order (set orderId on CouponUsage and create OrderCoupon row).
- If payment fails or the user removes coupon, the reserved CouponUsage should be cleaned up (by order/cancel flow). This implementation returns reservedUsageId which your order flow can use.

Developer notes
- After adding the Prisma schema you must run `npx prisma generate` and apply migrations before the new models are accessible.
- The service uses transactions for mutation paths.

---

### Payment Routes - Postman Testing Guide

This section lists payment-related routes and provides Postman-ready details.

Base URL
- Local: http://localhost:4000
- Production: (your production URL)

Postman Environment Variables (recommended)
- base_url = http://localhost:4000
- AUTH_TOKEN = <JWT token for authenticated routes>
- RAZORPAY_KEY_ID = <your razorpay key id>
- RAZORPAY_KEY_SECRET = <your razorpay key secret>

Common headers
- Content-Type: application/json
- Authorization: Bearer {{AUTH_TOKEN}} (for protected routes)

Routes

1) Create Razorpay Order
- POST {{base_url}}/api/payment/create-order
- Body (application/json):
```json
{
  "cartId": "<cart id>",
  "amount": 49900,
  "currency": "INR",
  "receipt": "order_receipt_123"
}
```
- Expected Response: 201 Created with order object

2) Verify Payment (signature-based)
- POST {{base_url}}/api/payment/verify
- Body:
```json
{
  "razorpay_payment_id": "pay_XXXXXXXX",
  "razorpay_order_id": "order_XXXXXXXX",
  "razorpay_signature": "<signature-from-razorpay>"
}
```
- Expected Response: 200 OK { success: true, message: "Payment verification successful" }

3) Verify Payment (Razorpay API fallback)
- POST {{base_url}}/api/payment/verify-api
- Body same as above but server calls Razorpay API to verify.

4) Retry Failed Payment Verification
- POST {{base_url}}/api/payment/retry
- Body: { "orderId": "order_XXXXXXXX" }

5) Test Razorpay Config (debug)
- GET {{base_url}}/api/payment/test-config

6) Test Signature Generation (debug)
- POST {{base_url}}/api/payment/test-signature

7) CORS Test Endpoint
- GET {{base_url}}/api/payment/test-cors

Notes
- Amounts are in the smallest currency unit (paise for INR).
- Keep Razorpay secret keys secure; set them as environment variables.

---

### Reviews API — Backend Reference

This document describes the Reviews feature: authentication flow, endpoints, request/response shapes, validation rules, error codes, and frontend integration tips.

> Example test account (dev only):
>- Email: akashthanda14@gmail.com
>- Password: Dolchi@0088

Authentication (JWT)
- All protected endpoints require a Bearer JWT in `Authorization` header.
- Sign-in: POST /api/auth/signin with { email, password } returns { token, user }.

Review model (conceptual)
- Unified resource for PRODUCT and DELIVERY reviews. Key fields: id, userId, type, productId, orderId, deliveryAgentId, rating (1..5), title, comment, images[], metadata, isEdited, isDeleted, createdAt.

Endpoints (base path: /api/reviews)
1) Create review — POST /api/reviews (auth)
- Validation: type required, rating 1..5 required; productId required for PRODUCT reviews (user must have purchased); orderId required for DELIVERY reviews (must be delivered and owned by user).
- Success: 201 with created object. Errors: 400,401,403,409,422.

2) Update review — PUT /api/reviews/:id (auth)
- Only owner or ADMIN/MODERATOR can update.

3) Delete review (soft-delete) — DELETE /api/reviews/:id (auth)

4) Get review — GET /api/reviews/:id

5) List reviews — GET /api/reviews with filters (type, productId, userId, hasImages, date range, pagination)

6) Summaries — GET /api/reviews/product/:productId/summary and GET /api/reviews/delivery/:deliveryAgentId/summary

Frontend notes
- Use summary endpoints for star/ histogram displays.
- After mutations, refresh summaries or update optimistically.

---

If you'd like, I can:
- Add cURL examples for each endpoint, or
- Produce a Postman collection / OpenAPI snippet for the frontend.

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Verification email sent successfully"
}
```

### 17. Verify Email by Link
**GET** `/user/verify-email`

Verify email using verification link from email.

**Query Parameters:**
- `token`: Email verification token

**Response:**
```json
{
  "success": true,
  "message": "Email verified successfully"
}
```

---

## 🔍 User Utility Endpoints

### 18. Check User Existence
**POST** `/user/check-user`

Check if user exists by email or phone.

**Request Body:**
```json
{
  "email": "user@example.com",        // Use this OR phoneNumber
  "phoneNumber": "+916239562383"      // Use this OR email
}
```

**Response:**
```json
{
  "exists": true,
  "hasPassword": true,
  "verification": {
    "emailVerified": true,
    "phoneVerified": false
  }
}
```

### 19. Send Unified OTP
**POST** `/user/auth/send-otp`

Send OTP for authentication purposes.

**Request Body:**
```json
{
  "identifier": "user@example.com",  // Email or phone number
  "type": "login"                    // login, register, etc.
}
```

**Response:**
```json
{
  "success": true,
  "message": "OTP sent successfully",
  "identifier": "user@example.com"
}
```

### 20. Check User for Auth
**POST** `/user/auth/check-user`

Check user status for authentication.

**Request Body:**
```json
{
  "identifier": "user@example.com"  // Email or phone number
}
```

**Response:**
```json
{
  "exists": true,
  "needsVerification": false,
  "hasPassword": true,
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "user@example.com",
    "emailVerified": true,
    "phoneVerified": true
  }
}
```

---

## 🗑️ Account Management

### 21. Request Account Deletion
**POST** `/user/request-account-deletion`
🔒 **Protected Route**

Request account deletion with OTP verification. OTP will be sent to both registered email and phone number (if available).

**Response:**
```json
{
  "success": true,
  "message": "OTP sent to registered email and phone for account deletion verification",
  "sentTo": ["email", "phone"]
}
```

**Note:** 
- If user has both email and phone, OTP is sent to both
- If user has only email or only phone, OTP is sent to the available contact method
- The same OTP can be used regardless of which contact method received it

### 22. Verify Account Deletion
**POST** `/user/verify-account-deletion`
🔒 **Protected Route**

Verify and delete account with OTP. This action is **irreversible**.

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

**⚠️ Warning:** 
- This action permanently deletes the user account and all associated data
- All user sessions will be invalidated
- This action cannot be undone

---

## 🔐 OAuth Authentication

### 23. Google OAuth Login
**GET** `/auth/google`

Initiate Google OAuth login flow.

**Response:**
Redirects to Google OAuth consent page.

### 24. Google OAuth Callback
**GET** `/auth/google/callback`

Handle Google OAuth callback.

**Response:**
Redirects to frontend with authentication token.

### 25. Facebook OAuth Login
**GET** `/auth/facebook`

Initiate Facebook OAuth login flow.

**Response:**
Redirects to Facebook OAuth consent page.

### 26. Facebook OAuth Callback
**GET** `/auth/facebook/callback`

Handle Facebook OAuth callback.

**Response:**
Redirects to frontend with authentication token.

### 27. OAuth Health Check
**GET** `/auth/health`

Check OAuth service health.

**Response:**
```json
{
  "status": "OK",
  "oauth": "configured",
  "timestamp": "2025-01-01T00:00:00.000Z"
}
```

---

## 📋 Response Format

### Success Response
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {
    // Response data
  }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description",
  "error": "ERROR_CODE",
  "details": {
    // Additional error details
  }
}
```

---

## ⚠️ Error Codes

| HTTP Status | Error Code | Description |
|------------|------------|-------------|
| 400 | BAD_REQUEST | Invalid request parameters |
| 401 | UNAUTHORIZED | Authentication required |
| 403 | FORBIDDEN | Access denied |
| 404 | NOT_FOUND | Resource not found |
| 409 | CONFLICT | Resource already exists |
| 422 | VALIDATION_ERROR | Input validation failed |
| 429 | RATE_LIMITED | Too many requests |
| 500 | INTERNAL_ERROR | Server error |

### Common Error Messages

- **"Invalid email format"** - Email validation failed
- **"Invalid phone number format"** - Phone number validation failed
- **"User already exists"** - Registration with existing email/phone
- **"Invalid credentials"** - Login failed
- **"Invalid or expired OTP"** - OTP verification failed
- **"Token expired"** - JWT token expired
- **"Email already in use"** - Email change to existing email
- **"Phone number already in use"** - Phone change to existing number

---

## 🔧 Environment Variables Required

```env
# Database
DATABASE_URL=postgresql://...

# JWT
JWT_SECRET=your-jwt-secret

# Email Service (Nodemailer)
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# SMS Service (Twilio)
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
TWILIO_PHONE_NUMBER=your-twilio-phone

# OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
FACEBOOK_APP_ID=your-facebook-app-id
FACEBOOK_APP_SECRET=your-facebook-app-secret

# Frontend URL
FRONTEND_URL=http://localhost:3000
```

---

## 📱 Frontend Integration Examples

### Login Flow
```javascript
// 1. Check if user exists
const checkUser = await fetch('/api/user/check-user', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'user@example.com' })
});

// 2. Login with password or OTP
const login = await fetch('/api/user/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password123'
  })
});

// 3. Store token and redirect
const { token, user } = await login.json();
localStorage.setItem('authToken', token);
```

### Phone Change Flow
```javascript
// 1. Request phone change
const requestChange = await fetch('/api/user/request-phone-change', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    newPhoneNumber: '+919876543210'
  })
});

// 2. Verify with OTP
const verifyChange = await fetch('/api/user/verify-phone-change', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    otp: '123456'
  })
});
```

### Account Deletion Flow
```javascript
// 1. Request account deletion
const requestDeletion = await fetch('/api/user/request-account-deletion', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

// 2. Verify with OTP (after receiving SMS/email)
const verifyDeletion = await fetch('/api/user/verify-account-deletion', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    otp: '123456'
  })
});

// 3. Account is permanently deleted
// Clear local storage and redirect to home page
localStorage.removeItem('authToken');
window.location.href = '/';
```

---

## 📝 Notes for Frontend Developers

1. **Token Management**: Store JWT tokens securely and include in all protected requests
2. **OTP Expiry**: OTPs expire in 5 minutes - implement countdown timers
3. **Rate Limiting**: Implement proper error handling for rate-limited endpoints
4. **Validation**: Validate email and phone formats on frontend before API calls
5. **Error Handling**: Always check response status and handle errors gracefully
6. **Loading States**: Show loading indicators during API calls
7. **Retry Logic**: Implement retry for failed network requests

---

**Last Updated**: September 9, 2025  
**API Version**: 1.0.0  
**Server URL**: http://localhost:4000
