# Reviews API — Backend Reference

This document describes the Reviews feature: authentication flow, endpoints, request/response shapes, validation rules, error codes, and frontend integration tips. It's written from a backend developer perspective to help frontend engineers integrate cleanly.

> Example test account (use only on your dev/test environment):
> - Email: akashthanda14@gmail.com
# Reviews API — Backend Reference

This document describes the Reviews feature: authentication flow, endpoints, request/response shapes, validation rules, error codes, and frontend integration tips. It's written from a backend developer perspective to help frontend engineers integrate cleanly.

> Example test account (use only on your dev/test environment):
> - Email: akashthanda14@gmail.com
> - Password: Dolchi@0088

## Authentication (JWT)

All protected endpoints require a Bearer JWT token in the `Authorization` header.

1) Sign-in (obtain JWT)

- Endpoint: POST /api/auth/signin
- Payload:
  - email (string, required)
  - password (string, required)

- Example request body:
  {
    "email": "akashthanda14@gmail.com",
    "password": "Dolchi@0088"
  }

- Example success response (200):
  {
    "token": "<JWT_TOKEN>",
    "user": { "id": 123, "email": "akashthanda14@gmail.com", "name": "Akash" }
  }

- How to use the token: set header `Authorization: Bearer <JWT_TOKEN>` for later requests.

Notes:
- If your app's signin endpoint differs (e.g., /api/user/login), adapt path but obtain JWT the same way.
- The token is required for creating, updating, and deleting reviews.

## Review Model (conceptual)

A unified `Review` resource supports two types:
- PRODUCT reviews: tied to a product and optionally an order
- DELIVERY reviews: tied to an order and optionally a delivery agent

Fields (key):
- id: string (cuid)
- userId: int
- type: 'PRODUCT' | 'DELIVERY'
- productId?: int
- orderId?: int
- deliveryAgentId?: int
- rating: int (1-5)
- title?: string
- comment?: string
- images?: string[] (URLs)
- metadata?: JSON
- isEdited: boolean
- isDeleted: boolean
- createdAt, updatedAt: timestamps

Denormalized on Product:
- product.averageRating (float)
- product.reviewsCount (int)

## Endpoints (base path: /api/reviews)

All responses follow JSON content-type. Errors use HTTP status codes and { message } in body.

1) Create review
- POST /api/reviews
- Auth: required (Bearer token)
- Validation:
  - type: required, 'PRODUCT' or 'DELIVERY'
  - rating: required, integer 1..5
  - if type === 'PRODUCT' => productId (int) required and user must have purchased product
  - if type === 'DELIVERY' => orderId (int) required and order must belong to user and be DELIVERED
  - title: optional (max 100 chars)
  - comment: optional (max 2000 chars)
  - images: optional array of strings (URLs)
  - metadata: optional JSON

- Example request body (product review):
  {
    "type": "PRODUCT",
    "productId": 17,
    "rating": 5,
    "title": "Excellent",
    "comment": "Loved the fabric",
    "images": ["https://cdn.example.com/i1.jpg"]
  }

- Success (201): created object returned
  {
    "id": "cjf...",
    "userId": 5,
    "type": "PRODUCT",
    "productId": 17,
    "rating": 5,
    "title": "Excellent",
    "comment": "Loved the fabric",
    "images": ["https://..."],
    "isEdited": false,
    "isDeleted": false,
    "createdAt": "2025-09-19T..."
  }

- Common Errors:
  - 400 Bad Request: missing required fields
  - 401 Unauthorized: no/invalid token
  - 403 Forbidden: trying to review an order not owned by user
  - 409 Conflict: review already exists for this user/product/order
  - 422 Unprocessable Entity: user hasn't purchased the product / order not delivered

Notes for frontend:
- Ensure the user has an order containing the product before allowing create review UI.
- Show friendly messages mapping error codes to UI strings.

2) Update review
- PUT /api/reviews/:id
- Auth: required
- Validation: rating optional (1..5), title/comment/images optional
- Only review owner or ADMIN/MODERATOR can update.
- Body example:
  { "rating": 4, "comment": "Updated comment" }
- Success: returns updated review object.
- 403 Forbidden if user isn't owner/admin.

3) Delete (soft-delete) review
- DELETE /api/reviews/:id
- Auth: required
- Only owner or ADMIN/MODERATOR can delete
- Success: { "success": true }
- Soft-delete will trigger aggregate recalculation

4) Get review by id
- GET /api/reviews/:id
- Auth: optional. If the review is soft-deleted, only owner/admin/moderator can view.
- Success: review object

5) List / search reviews
- GET /api/reviews
- Query params (all optional):
  - type: PRODUCT|DELIVERY
  - productId, orderId, deliveryAgentId, userId, rating
  - minRating, maxRating
  - hasImages: boolean
  - fromDate, toDate (ISO)
  - includeDeleted: boolean
  - page (default 1), pageSize (default 20)
  - sort: e.g., createdAt_desc or rating_asc
- Response:
  {
    items: [ ...reviews ],
    pageInfo: { page, pageSize, total, hasNextPage }
  }

Notes:
- For product pages, query ?type=PRODUCT&productId=<id>&page=1 to render recent reviews and pagination.
- Use hasImages to filter reviews with photos.

6) Product / Delivery summaries
- GET /api/reviews/product/:productId/summary
  - Returns: { averageRating, reviewsCount, distribution }
  - distribution: counts for ratings 1..5
- GET /api/reviews/delivery/:deliveryAgentId/summary
  - Same shape as product summary

Frontend notes:
- Use summaries to show star rating and histogram (distribution) without fetching all reviews.
- Update UI after create/update/delete: either refetch summary endpoint or optimistically update counts.

## Example integration flow (frontend)

1) Sign in and store JWT in secure storage (HTTP-only cookie or local storage depending on app security policy).
2) Ensure product page calls summary endpoint to render avg rating and count.
3) When user clicks "Write a review":
   - Check if user purchased product (optional client-side check via orders endpoint) or rely on server validation.
   - POST /api/reviews with payload above and Bearer token.
   - On success: show success toast and refresh product summary and review list.

## Validation rules summary (for frontend validations)
- rating: integer 1..5 required
- type: product|delivery required
- productId/orderId required depending on type
- title: max length 100
- comment: max length 2000
- images: array of URLs

## Error handling mapping (suggested messages)
- 400 -> "Please fill required fields"
- 401 -> "Please login to continue"
- 403 -> "You are not allowed to perform this action"
- 409 -> "You have already posted a review"
- 422 -> "You must purchase this product / Order must be delivered"
- 500 -> "Something went wrong, please try again later"

## Websocket / Realtime (optional)
- If you use realtime updates for reviews, emit events on create/update/delete and update product summaries in clients.

## Sample front-end request (fetch)

Fetch example to create a product review:

fetch('/api/reviews', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer <JWT_TOKEN>'
  },
  body: JSON.stringify({ type: 'PRODUCT', productId: 17, rating: 5, title: 'Great' })
})
.then(r => r.json())
.then(data => console.log(data));

## Security and rate-limiting
- Server enforces review uniqueness (one review per user per product/order) and purchase/delivery checks.
- Rate-limit review endpoints server-side as needed (not implemented here by default in this module).

## Troubleshooting
- 422 when creating product review: ensure the order containing the product exists and has not been cancelled; check `order_items` and `orders` records.
- FK errors on product creation in dev: ensure categories/subcategories exist (see scripts/insert_categories.js).

---

If you want, I can also:
- Add example cURL requests for each endpoint, or
- Create a Postman collection / OpenAPI snippet for the frontend.

## Testing with Postman (upload photos)

This section explains how to test the review endpoints in Postman, including uploading up to 2 images (multipart/form-data). The server uses `multer` (memoryStorage) and streams images to Cloudinary. Per-file limits: 2MB. Allowed mime types: image/png, image/jpeg, image/jpg, image/webp.

Before you start:
- Obtain a JWT via POST /api/auth/signin and include it in the `Authorization: Bearer <JWT_TOKEN>` header for protected endpoints.
- Use `form-data` body type in Postman when uploading images. File field name: `images` (up to 2 files).
- Non-file fields should be sent as text form fields. If sending `metadata`, stringify it (e.g. `{"size":"M"}`).

Example: Create PRODUCT review with up to 2 images
- Method: POST
- URL: https://<your-host>/api/reviews
- Headers: Authorization: Bearer <JWT_TOKEN>
- Body -> form-data:
  - type: PRODUCT
  - productId: 17
  - rating: 5
  - title: Excellent
  - comment: Loved the fabric
  - metadata: {"size":"M","color":"white"}   (as a string)
  - images: (file) upload image #1
  - images: (file) upload image #2 (optional)

Expected: HTTP 201 with created review object; `images` field contains Cloudinary secure URLs.

Example: Create DELIVERY review with images
- Method: POST
- URL: https://<your-host>/api/reviews
- Body -> form-data:
  - type: DELIVERY
  - orderId: 123
  - rating: 4
  - comment: Delivery was on time
  - images: (file) up to 2 images

Update review (add/replace images)
- Method: PATCH
- URL: https://<your-host>/api/reviews/:id
- Body -> form-data: include `rating`, `title`, `comment`, `metadata`, and up to 2 files under `images`. Uploaded files are uploaded to Cloudinary and merged with any existing `images` provided in the JSON body; final array is trimmed to 2 URLs.

Quick cURL (single image):
curl -X POST "https://<your-host>/api/reviews" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -F "type=PRODUCT" \
  -F "productId=17" \
  -F "rating=5" \
  -F "title=Nice" \
  -F "images=@/path/to/photo1.jpg"

Troubleshooting & common errors with file uploads
- 400 Bad Request: missing required fields (type, rating, productId/orderId when required).
- 401 Unauthorized: missing/invalid JWT.
- 403 Forbidden: reviewing an order you don't own.
- 409 Conflict: duplicate review for the same user/product/order.
- 422 Unprocessable Entity: user hasn't purchased the product / order not delivered.
- Unsupported file type or file too large: multer rejects files >2MB or non-image mime types.
- 500 Internal Server Error: Cloudinary or server-side error — check server logs.

Postman tips
- Use `form-data` and set file keys to `File`, text keys to `Text`.
- For `metadata`, stringify JSON in the form field and parse client-side as needed.
- If you get a validation error, inspect the response body for details and ensure you included all required fields.

Optional queries to test
- GET /api/reviews?type=PRODUCT&productId=17&page=1 — list reviews for a product.
- GET /api/reviews/products/:productId — product reviews + summary.
- GET /api/reviews/orders/:orderId — delivery review for an order (requires auth).

If you want, I can export a Postman collection with these requests pre-filled (including an Authorization helper to set the Bearer token).

