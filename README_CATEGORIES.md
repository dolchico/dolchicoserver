## Categories, Subcategories, Offers & OfferTypes API

This document describes the Category, Subcategory, Offer and OfferType APIs available in the Dolchico server.

Base path: `/api`

Content types:
- `application/json` for most endpoints
- `multipart/form-data` for endpoints accepting file uploads (category image, subcategory image, offer icon, offer type icon)

Authentication:
- Admin endpoints require a Bearer JWT token with `ADMIN` role. Use `ensureAuthWithStatus` and `ensureRole(['ADMIN'])` middleware.
- Public endpoints do not require authentication.

---

## Quick Reference
- Admin group (protected): `/api/admin/*` — create/update/delete categories, subcategories, offers
- OfferTypes: `/api/offer-types/*` — create/manage offer types (admin), list/get (public)
- Public: `/api/categories` and related read endpoints

File Upload fields:
- Category image: form field `image`
- Subcategory image: form field `image`
- Offer icon: form field `icon`
- OfferType icon: form field `icon`

Uploaded files are uploaded directly to Cloudinary (not stored on the server filesystem). Responses reference uploaded assets by their Cloudinary secure URLs (for example: `https://res.cloudinary.com/<cloud_name>/...`). `multer` is configured to use in-memory storage and files are streamed to Cloudinary by the server.

---

## Endpoints

### Admin: Create Category
- Method: POST
- Path: `/api/admin/categories`
- Auth: Bearer JWT (ADMIN)
- Content-Type: `multipart/form-data`
- Form fields:
	- `name` (string, required)
	- `description` (string, optional)
	- `image` (file, optional)
- Success: 201 Created — returns created Category object

Example response (201):
```json
{
	"id": 1,
	"name": "Clothing",
	"description": "Men and women clothing",
	"imageUrl": "/uploads/clothing.png",
	"isActive": true,
	"createdAt": "2025-09-24T...",
	"updatedAt": "2025-09-24T..."
}
```

Errors:
- 400 Bad Request — validation errors
- 401 Unauthorized — missing/invalid token
- 403 Forbidden — insufficient role
- 500 Internal Server Error

Business notes:
- Files are uploaded to Cloudinary; controllers set `imageUrl`/`iconUrl` to the Cloudinary secure URL returned after upload.

### Admin: Update Category
- Method: PUT
- Path: `/api/admin/categories/:id`
- Auth: Bearer JWT (ADMIN)
- Content-Type: `multipart/form-data` or `application/json`
- Body: same fields as create. If `image` provided it replaces `imageUrl`.
- Success: 200 OK — updated Category

### Admin: Delete Category
- Method: DELETE
- Path: `/api/admin/categories/:id`
- Auth: Bearer JWT (ADMIN)
- Success: 204 No Content

### Admin: Bulk Initialize Categories
- Method: POST
- Path: `/api/admin/categories/initialize`
- Auth: Bearer JWT (ADMIN)
- Content-Type: `application/json`
- Body: array of category objects with nested `subcategories` and `offers` (dates ISO strings)
- Success: 201 Created — created categories array

### Admin: Add Subcategory
- Method: POST
- Path: `/api/admin/categories/:id/subcategories`
- Auth: Bearer JWT (ADMIN)
- Content-Type: `multipart/form-data`
- Fields:
	- `name` (string, required)
	- `grouping` (string, required)
	- `image` (file, optional)
- Success: 201 Created — created Subcategory

### Admin: Update/Delete Subcategory
- PUT `/api/admin/subcategories/:id` — update
- DELETE `/api/admin/subcategories/:id` — delete
- Auth: ADMIN

### Admin: Add Offer
- Method: POST
- Path: `/api/admin/categories/:id/offers`
- Auth: Bearer JWT (ADMIN)
- Content-Type: `multipart/form-data`
- Fields:
	- `title` (string, required)
	- `description` (string)
	- `discountPercent` (number, required)
	- `startDate` (ISO date string)
	- `endDate` (ISO date string)
	- `offerTypeId` (int, optional)
	- `icon` (file, optional)
- Behavior: controller coerces `startDate`/`endDate` to Date, sets `iconUrl` on upload, links `offerTypeId` if provided.
- Success: 201 Created — created Offer

### Admin: Update/Delete Offer
- PUT `/api/admin/offers/:id` — update; supports icon upload
- DELETE `/api/admin/offers/:id` — delete

### OfferType APIs
- Create: POST `/api/offer-types` (admin, `icon` upload) — 201
- Update: PUT `/api/offer-types/:id` (admin, `icon` upload) — 200
- Delete: DELETE `/api/offer-types/:id` (admin) — 204
- Public: GET `/api/offer-types` — list; GET `/api/offer-types/:id` — get

### Public: Categories & Offers
- GET `/api/categories` — list active categories (includes subcats & offers)
- GET `/api/categories/:name` — category by name
- GET `/api/categories/:name/subcategories` — subcategories list
- GET `/api/categories/:name/offers` — offers list
- GET `/api/subcategories/grouping/:grouping` — list by grouping

---

## Field Definitions

### Category
| Field | Type | Required | Description |
|---|---:|:---:|---|
| id | Int | Yes | Auto-increment primary key |
| name | String | Yes | Unique category name |
| description | String | No | Category description |
| imageUrl | String | No | Cloudinary secure URL to uploaded image |
| isActive | Boolean | No | Defaults to true |
| createdAt | DateTime | Yes | Auto timestamp |
| updatedAt | DateTime | Yes | Auto timestamp |

### Subcategory
| Field | Type | Required | Description |
|---|---:|:---:|---|
| id | Int | Yes | PK |
| name | String | Yes | Unique per category |
| grouping | String | Yes | Semantic grouping e.g., Topwear |
| categoryId | Int | Yes | FK to Category |
| imageUrl | String | No | Cloudinary secure URL to uploaded image |
| isActive | Boolean | No | Defaults to true |
| createdAt | DateTime | Yes | |
| updatedAt | DateTime | Yes | |

### Offer
| Field | Type | Required | Description |
|---|---:|:---:|---|
| id | Int | Yes | PK |
| title | String | Yes | Offer title |
| description | String | Yes | |
| discountPercent | Float | Yes | e.g., `20.0` for 20% |
| iconUrl | String | No | Cloudinary secure URL to uploaded icon |
| isActive | Boolean | No | Default true |
| startDate | DateTime | Yes | Start timestamp |
| endDate | DateTime | Yes | End timestamp |
| categoryId | Int | Yes | FK to Category |
| offerTypeId | Int | No | Optional FK to OfferType |
| createdAt | DateTime | Yes | |
| updatedAt | DateTime | Yes | |

### OfferType
| Field | Type | Required | Description |
|---|---:|:---:|---|
| id | Int | Yes | PK |
| name | String | Yes | Unique |
| description | String | No | |
| iconUrl | String | No | Uploaded icon path |
| isActive | Boolean | No | Default true |
| createdAt | DateTime | Yes | |
| updatedAt | DateTime | Yes | |

---

## Success and Error Responses

Standard success for GET:
```json
{
	"id": 1,
	"name": "Clothing",
	"description": "All clothing",
	"imageUrl": "https://res.cloudinary.com/<cloud_name>/image/upload/v.../cat.png",
	"isActive": true,
	"subcategories": [{ "id": 10, "name": "Shirts", "imageUrl": "/uploads/shirts.png" }],
	"offers": [{ "id": 20, "title": "Festive", "discountPercent": 20 }]
}
```

Standard error format used by controllers:
```json
{ "message": "A descriptive error message" }
```

Examples:
- 401 Unauthorized:
```json
{ "message": "Unauthorized" }
```
- 403 Forbidden:
```json
{ "message": "Forbidden: admin role required" }
```
- 404 Not found:
```json
{ "message": "Category not found" }
```
- 400 Bad Request:
```json
{ "message": "Validation error: name is required" }
```

---

## HTTP Status Codes
| Status | Meaning |
|---:|---|
| 200 | OK (GET/PUT success) |
| 201 | Created (POST success) |
| 204 | No Content (DELETE success) |
| 400 | Bad Request (validation) |
| 401 | Unauthorized (missing/invalid token) |
| 403 | Forbidden (role mismatch) |
| 404 | Not Found |
| 409 | Conflict (unique constraint) |
| 500 | Internal Server Error |

---

## Business Logic & Validation
- Category `name` must be unique.
- Subcategory `name` unique per category (DB enforced by Prisma unique composite index).
- Offer `discountPercent` must be a number (0 < value <= 100). Consider adding server-side validation.
- Offer `startDate` and `endDate` should be valid dates. The service converts ISO strings to Date objects when present.
- `offerTypeId` must reference an existing OfferType if provided. Service-level validation recommended to avoid FK errors.
- Uploaded files: recommend MIME-type checks and size limits in `middleware/multer.js`.

---

## Frontend Integration Examples

Axios instance:
```javascript
import axios from 'axios';

export const api = axios.create({ baseURL: '/api', headers: { 'Content-Type': 'application/json' } });
export const authApi = (token) => axios.create({ baseURL: '/api', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } });
```

React hook example (create category with image):
```javascript
import { useState } from 'react';
import { authApi } from './api';

export function useCreateCategory(token) {
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);

	const createCategory = async ({ name, description, file }) => {
		setLoading(true);
		setError(null);
		try {
			const fd = new FormData();
			fd.append('name', name);
			if (description) fd.append('description', description);
			if (file) fd.append('image', file);
			const res = await authApi(token).post('/admin/categories', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
			return res.data;
		} catch (err) {
			setError(err.response?.data?.message || err.message);
			throw err;
		} finally {
			setLoading(false);
		}
	};

	return { createCategory, loading, error };
}
```

Component snippet:
```jsx
<form onSubmit={onSubmit}>
	<input value={name} onChange={e => setName(e.target.value)} placeholder="Name" required />
	<textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Description" />
	<input type="file" accept="image/*" onChange={e => setFile(e.target.files[0])} />
	<button type="submit" disabled={loading}>Create</button>
</form>
```

### Frontend: Upload an Offer with an icon (FormData)

Example (axios + FormData) for creating an offer that includes an image file. The server uploads the file to Cloudinary and returns a secure URL in `iconUrl`.

```javascript
import { authApi } from './api';

async function createOfferWithIcon(token, categoryId, form) {
	const fd = new FormData();
	fd.append('title', form.title);
	fd.append('description', form.description);
	fd.append('discountPercent', String(form.discountPercent));
	if (form.startDate) fd.append('startDate', form.startDate);
	if (form.endDate) fd.append('endDate', form.endDate);
	if (form.offerTypeId) fd.append('offerTypeId', String(form.offerTypeId));
	if (form.iconFile) fd.append('icon', form.iconFile);

	const res = await authApi(token).post(`/admin/categories/${categoryId}/offers`, fd, {
		headers: { 'Content-Type': 'multipart/form-data' }
	});

	return res.data; // created offer object (includes iconUrl)
}
```

Sample response (201):

```json
{
	"id": 20,
	"title": "Festive",
	"description": "20% off",
	"discountPercent": 20,
	"iconUrl": "https://res.cloudinary.com/<cloud_name>/image/upload/v.../offers/abc123.png",
	"isActive": true,
	"startDate": "2025-09-01T00:00:00.000Z",
	"endDate": "2025-09-30T23:59:59.000Z",
	"categoryId": 1,
	"offerTypeId": 2,
	"offerRules": []
}
```

Note: `imageUrl` and `iconUrl` fields will contain Cloudinary secure URLs after successful upload.

---

## Testing

Sample curl commands:

Create category with image:
```bash
curl -X POST "http://localhost:4000/api/admin/categories" \
	-H "Authorization: Bearer $ADMIN_TOKEN" \
	-F "name=Clothing" \
	-F "description=Men & women" \
	-F "image=@/path/to/image.png"
```

Create subcategory:
```bash
curl -X POST "http://localhost:4000/api/admin/categories/1/subcategories" \
	-H "Authorization: Bearer $ADMIN_TOKEN" \
	-F "name=Shirts" \
	-F "grouping=Topwear" \
	-F "image=@/path/to/shirts.png"
```

Add offer with icon and optional offerTypeId:
```bash
curl -X POST "http://localhost:4000/api/admin/categories/1/offers" \
	-H "Authorization: Bearer $ADMIN_TOKEN" \
	-F "title=Festive" \
	-F "description=20% off" \
	-F "discountPercent=20" \
	-F "startDate=2025-09-01T00:00:00Z" \
	-F "endDate=2025-09-30T23:59:59Z" \
	-F "offerTypeId=2" \
	-F "icon=@/path/to/icon.png"
```

List categories (public):
```bash
curl http://localhost:4000/api/categories
```

Test scenarios:
- Create valid category -> expect 201 and `imageUrl` set
- Create duplicate category -> expect unique constraint error (409/500)
- Create subcategory with duplicate name under same category -> expect unique constraint error
- Create offer with invalid dates (start > end) -> expect 400 (server-side validation recommended)
- Upload unsupported file type -> expect 400 if validation is added

---

## Security & Rate Limiting

- Admin endpoints protected: include `Authorization: Bearer <token>` header. Role `ADMIN` required.
- File upload security recommendations:
	- Restrict MIME types to `image/png`, `image/jpeg`, `image/webp`.
	- Enforce max file size (e.g., 2MB).
	- Rename files to UUID/timestamp to avoid collisions and path traversal.
	- Serve uploaded files via static route with proper headers and no directory listing.
- Rate limiting: apply `apiLimiter` to admin endpoints.

---

## Database Schema (Prisma snippets)

Category (prisma):
```prisma
model Category {
	id            Int      @id @default(autoincrement())
	name          String   @unique @db.VarChar(100)
	description   String?
	imageUrl      String?
	isActive      Boolean  @default(true)
	createdAt     DateTime @default(now())
	updatedAt     DateTime @updatedAt
	subcategories Subcategory[]
	offers        Offer[]
	products      Product[]
	@@index([isActive])
	@@map("categories")
}
```

Subcategory (prisma):
```prisma
model Subcategory {
	id          Int      @id @default(autoincrement())
	name        String   @db.VarChar(100)
	grouping    String   @db.VarChar(100)
	categoryId  Int
	imageUrl    String?
	isActive    Boolean  @default(true)
	createdAt   DateTime @default(now())
	updatedAt   DateTime @updatedAt
	category    Category @relation(fields: [categoryId], references: [id], onDelete: Cascade)
	products    Product[]
	@@unique([name, categoryId])
	@@index([grouping])
	@@index([categoryId])
	@@map("subcategories")
}
```

Offer (prisma):
```prisma
model Offer {
	id              Int       @id @default(autoincrement())
	title           String    @db.VarChar(255)
	description     String
	discountPercent Float
	iconUrl         String?
	isActive        Boolean   @default(true)
	startDate       DateTime
	endDate         DateTime
	categoryId      Int
	offerTypeId     Int?
	createdAt       DateTime  @default(now())
	updatedAt       DateTime  @updatedAt
	category        Category  @relation(fields: [categoryId], references: [id], onDelete: Cascade)
	offerType       OfferType? @relation(fields: [offerTypeId], references: [id])
	@@index([categoryId])
	@@index([isActive, startDate, endDate])
	@@map("offers")
}
```

OfferType (prisma):
```prisma
model OfferType {
	id          Int      @id @default(autoincrement())
	name        String   @unique @db.VarChar(100)
	description String?
	iconUrl     String?
	isActive    Boolean  @default(true)
	createdAt   DateTime @default(now())
	updatedAt   DateTime @updatedAt
	offers      Offer[]
	@@map("offer_types")
}
```

---

## Implementation Notes & Next Steps

- Run Prisma sync:
```bash
npx prisma generate
npx prisma db push
```
- Serve uploaded files via static middleware in `server.js`:
```js
import path from 'path';
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
```
- Improve `middleware/multer.js` to validate MIME and rename files (UUID/timestamp).
- Add input validation (Joi/zod/express-validator) for create/update endpoints.
- Add tests (supertest + jest) for critical endpoints.

If you want I can implement any of the next steps above (add static serve, enhance multer, run prisma push, add tests). Tell me which to run next.