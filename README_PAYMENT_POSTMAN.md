# Payment Routes - Postman Testing Guide

This document lists all backend payment-related routes and provides Postman-ready details for testing.

Base URL
- Local: http://localhost:4000
- Production: https://valyris-i.onrender.com

Postman Environment Variables (recommended)
- base_url = http://localhost:4000 (or https://valyris-i.onrender.com)
- AUTH_TOKEN = <JWT token for authenticated routes>
- RAZORPAY_KEY_ID = <your razorpay key id>
- RAZORPAY_KEY_SECRET = <your razorpay key secret>

Common headers
- Content-Type: application/json
- Authorization: Bearer {{AUTH_TOKEN}} (for protected routes)
- Origin: https://dolchico.com (to simulate browser origin when testing CORS)

Routes

1) Create Razorpay Order
- Method: POST
- URL: {{base_url}}/api/payment/create-order
- Auth: Yes (user must be logged in)
- Body (application/json):
  {
    "cartId": "<cart id>",
    "amount": 49900, // amount in paisa (INR)
    "currency": "INR",
    "receipt": "order_receipt_123"
  }
- Expected Response: 201 Created
  {
    "success": true,
    "order": { "id": "order_XXXXXXXX", "amount": 49900, ... }
  }
- Notes: The server will call Razorpay to create an order object which the frontend uses to open the checkout.

2) Verify Payment (signature-based)
- Method: POST
- URL: {{base_url}}/api/payment/verify
- Auth: Yes (user must be logged in)
- Body (application/json):
  {
    "razorpay_payment_id": "pay_XXXXXXXX",
    "razorpay_order_id": "order_XXXXXXXX",
    "razorpay_signature": "<signature-from-razorpay>"
  }
- Expected Response (success): 200 OK
  {
    "success": true,
    "message": "Payment verification successful",
    "verificationMethod": "signature"
  }
- Common failures:
  - 400 Bad Request: missing fields
  - 400 Verification failed: signature mismatch
  - 502/5xx: upstream error (deployment/Render issue)

3) Verify Payment (Razorpay API fallback)
- Method: POST
- URL: {{base_url}}/api/payment/verify-api
- Auth: Yes (user must be logged in)
- Body (application/json):
  {
    "razorpay_payment_id": "pay_XXXXXXXX",
    "razorpay_order_id": "order_XXXXXXXX"
  }
- Expected Response: 200 OK (if payment captured and matches amount)
  {
    "success": true,
    "message": "Payment verified via API",
    "verificationMethod": "api"
  }
- Notes: Uses server-side Razorpay API to fetch payment details and verify capture. Useful if signature verification fails.

4) Retry Failed Payment Verification
- Method: POST
- URL: {{base_url}}/api/payment/retry
- Auth: Yes
- Body (application/json):
  {
    "orderId": "order_XXXXXXXX"
  }
- Expected Response: 200 OK
  {
    "success": true,
    "message": "Retry scheduled or verification retried"
  }

5) Test Razorpay Config (debug)
- Method: GET
- URL: {{base_url}}/api/payment/test-config
- Auth: No
- Expected Response: 200 OK with basic config info

6) Test Signature Generation (debug)
- Method: POST
- URL: {{base_url}}/api/payment/test-signature
- Auth: No
- Body (application/json):
  {
    "order_id": "order_XXXXXXXX",
    "payment_id": "pay_XXXXXXXX"
  }
- Expected Response: 200 OK with generated signature to compare

7) CORS Test Endpoint
- Method: GET
- URL: {{base_url}}/api/payment/test-cors
- Auth: No
- Headers: add `Origin: https://dolchico.com`
- Expected Response: 200 OK with origin echoed and list of allowed origins

Testing checklist (order)
1. Ensure server is running (local) or deployment is healthy (production `/health`).
2. Set `{{base_url}}` in Postman environment.
3. For protected routes, login and set `AUTH_TOKEN`.
4. Create an order with `/create-order` and copy `order.id`.
5. Simulate checkout or call `/test-signature` to get signature (debug only).
6. Call `/verify` with payment id/order id/signature or `/verify-api` if signature fails.
7. If CORS errors occur from browser testing, call `/api/payment/test-cors` with `Origin: https://dolchico.com` to confirm server allows origin.

Troubleshooting
- CORS: If you see "No 'Access-Control-Allow-Origin' header", ensure the server's CORS config includes your `Origin` or use `test-cors` to debug.
- 502 Bad Gateway: Check deployment logs (Render) and the `/health` endpoint to ensure process is running.
- Signature mismatch: Ensure Razorpay key secret on server matches merchant settings. Use `/test-signature` to reproduce signature.

Notes
- Amounts are in the smallest currency unit (paise for INR).
- Keep Razorpay secret keys secure; set them as environment variables in production.
- Use `verify-api` only if you trust server-side Razorpay API verification as a fallback.

Saved Postman collection recommendation
- Create a collection named "Dolchico - Payments" and add requests using the above endpoints.
- Add environment with `base_url`, `AUTH_TOKEN`, and Razorpay keys.

---
If you'd like, I can also:
- create and export a ready-made Postman collection JSON file
- add a small Node script to simulate a full payment flow


Running the included Node test script
-----------------------------------

There's a lightweight test runner at `scripts/payment_test.js` that uses `axios` to exercise the main payment endpoints.

Prerequisites:
- Node 18+ (or a Node version that supports native ESM imports)
- Install dependencies in the repo root: `npm install axios`

Example run (copy/paste):

```bash
BASE_URL=http://localhost:4000 \
JWT="<YOUR_JWT>" \
RAZORPAY_KEY_SECRET="<your_razorpay_secret>" \
node scripts/payment_test.js
```

Notes:
- The script will call `/api/payment/create-order` and expects a valid JWT for protected endpoints.
- Signature-based verify requires `RAZORPAY_KEY_SECRET` to generate a matching HMAC for the test payment id.
- `verify-api` will call Razorpay API; it will fail unless valid Razorpay payment IDs and keys exist.

