Generate Ticket API — frontend integration guide

POST /api/generateticket

Overview

This endpoint creates a support ticket and (optionally) related ticket product rows. It accepts JSON only and returns a strict JSON envelope on success and on errors. Authentication is optional: if a valid Bearer JWT is provided, the server will set userId from the token subject and will reject requests where the body-provided userId does not match the token subject.

Base URL

- Example local dev base: http://localhost:4000
- Full endpoint (POST): /api/generateticket

Authentication

- Optional Bearer token in Authorization header: "Authorization: Bearer <jwt>"
- If a token is present and valid, the server will use token.subject (sub) as the authenticated user id.
- If the request body includes userId and it does not match the token sub, the request will be rejected with 401 (INVALID_TOKEN).

Request headers

- Content-Type: application/json
- Authorization: Bearer <token> (optional)

Request body (strict contract)

All fields are JSON fields. Unknown fields will be rejected.

Required fields:
- fullName: string
  - trimmed
  - length: 2–100 chars
- email: string
  - valid email; normalized to lowercase when stored
- subject: string
  - trimmed
  - length: 3–200 chars
- message: string
  - trimmed
  - length: 10–2000 chars

Optional fields:
- userId: number (positive integer)
- orderId: number (positive integer)
- products: array (1–50) of objects
  - productId: number (positive integer)
  - productName: string (trimmed, 1–200 chars)
  - action: string enum: either "Refund" or "Replacement"

Category derivation rules (ticket.category)

- If products exist and all product actions are "Replacement" -> category = "replacement"
- If products exist and all product actions are "Refund" -> category = "refund"
- If products exist and product actions are mixed -> category = "mixed"
- If no products:
  - subject contains "refund" (case-insensitive) -> "refund"
  - subject contains "replacement" -> "replacement"
  - otherwise -> "general"

Business defaults on creation (read-only to frontend)

- status = "open"
- resolutionStatus = "unresolved"
- priority = "medium"
- estimatedResponse = "24-48 hours"

Success response (200 OK)

Exact shape (JSON):
{
  "success": true,
  "message": "Support ticket created successfully",
  "data": {
    "ticketId": "TKT-20250916-XXXXXX",
    "status": "open",
    "priority": "medium",
    "createdAt": "<ISO UTC>",
    "estimatedResponse": "24-48 hours",
    "category": "<refund|replacement|mixed|general>"
  }
}

Validation errors (400 Bad Request)

Exact shape:
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    { "field": "<field>", "message": "<reason>" }
  ]
}

Authentication errors (401 Unauthorized)

Exact shape when token invalid or mismatch:
{
  "success": false,
  "message": "Invalid or expired authentication token",
  "error": "INVALID_TOKEN"
}

Rate limit (optional middleware) shape (429)

The controller supports returning this envelope if upstream middleware sets a rate-limited flag (not implemented here):
{
  "success": false,
  "message": "Too many ticket creation requests. Please try again later.",
  "error": "RATE_LIMITED",
  "retryAfter": 300
}

Server error (500)

Exact shape:
{
  "success": false,
  "message": "Internal server error occurred while creating ticket",
  "error": "INTERNAL_ERROR"
}

Integration notes for frontend dev

- Always set Content-Type: application/json.
- Trim and validate fields client-side to avoid 400s where possible.
- If the user is authenticated, include the JWT in Authorization header. The backend will set userId automatically.
- The frontend should display the returned data.ticketId and createdAt to the user as confirmation.
- Do not rely on ticketId format for parsing; treat it as an opaque identifier to display and store.

Example request (guest user)

POST /api/generateticket
Content-Type: application/json

Body:
{
  "fullName": "Akash Kulshrestha",
  "email": "akashthanda14@gmail.com",
  "subject": "Issue with my order",
  "message": "Some products in my order need refund or replacement.",
  "orderId": 5001,
  "products": [
    { "productId": 101, "productName": "Wireless Mouse", "action": "Replacement" },
    { "productId": 102, "productName": "Keyboard", "action": "Refund" }
  ]
}

Quick test script (developer can run locally)

- Start the server (dev):
  npm run dev

- Run the provided test script to exercise common cases:
  node scripts/test_ticket_api.js

If you want the test script to target a different host, set BASE_URL environment variable:

BASE_URL="http://staging.example.com/api/generateticket" node scripts/test_ticket_api.js

Contact / follow-ups

If you want additional example payloads (large product arrays, maximum-length messages, or edge cases like missing fields), tell me which scenarios and I will append them to the test script and re-run.
