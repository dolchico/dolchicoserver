Categories API — Frontend integration guide

Base path: /api/admin (for protected admin endpoints) and /api for public endpoints

Auth
- Admin endpoints require a valid Bearer JWT and the user to have role ADMIN.
- Public endpoints are unauthenticated.

Overview of endpoints

Admin (protected) — prefix: /api/admin

1) Create category
- Method: POST
- Path: /api/admin/categories
- Auth: required (ADMIN)
- Body: JSON — any fields accepted by Category model (example below). The server expects a `name` and other category fields.
- Success: 201 Created with created category JSON

Example request body:
{
  "name": "Electronics",
  "isActive": true,
  "description": "All electronic items",
  "meta": {"seoTitle":"Electronics"}
}

2) Update category
- Method: PUT
- Path: /api/admin/categories/:id
- Auth: required (ADMIN)
- Body: JSON — fields to update
- Success: 200 OK with updated category JSON

3) Delete category
- Method: DELETE
- Path: /api/admin/categories/:id
- Auth: required (ADMIN)
- Success: 204 No Content

4) Initialize categories (bulk)
- Method: POST
- Path: /api/admin/categories/initialize
- Auth: required (ADMIN)
- Body: JSON array of category objects. Each object may include `subcategories` and `offers` arrays; service will create them in a single operation.
- Success: 201 Created with { message: 'Data initialized successfully', data: [...] }

5) Add subcategory to category
- Method: POST
- Path: /api/admin/categories/:id/subcategories
- Auth: required (ADMIN)
- Body: JSON with subcategory fields (e.g., name, grouping)
- Success: 201 Created with created subcategory JSON

6) Add offer to category
- Method: POST
- Path: /api/admin/categories/:id/offers
- Auth: required (ADMIN)
- Body: JSON with offer details. `startDate` and `endDate` strings are accepted and converted to Date on server.
- Success: 201 Created with created offer JSON

7) Update subcategory
- Method: PUT
- Path: /api/admin/subcategories/:id
- Auth: required (ADMIN)
- Body: JSON — fields to update
- Success: 200 OK with updated subcategory JSON

8) Delete subcategory
- Method: DELETE
- Path: /api/admin/subcategories/:id
- Auth: required (ADMIN)
- Success: 204 No Content

9) Update offer
- Method: PUT
- Path: /api/admin/offers/:id
- Auth: required (ADMIN)
- Body: JSON — fields to update (server will parse startDate/endDate if present)
- Success: 200 OK with updated offer JSON

10) Delete offer
- Method: DELETE
- Path: /api/admin/offers/:id
- Auth: required (ADMIN)
- Success: 204 No Content

Public (no auth) — prefix: /api

11) Get all categories
- Method: GET
- Path: /api/categories
- Query: none
- Success: 200 OK with array of categories (includes subcategories and offers)

12) Get category by name
- Method: GET
- Path: /api/categories/:name
- Success: 200 OK with category object (includes subcategories and offers)

13) Get subcategories by category name
- Method: GET
- Path: /api/categories/:name/subcategories
- Success: 200 OK with array of subcategories

14) Get offers by category name
- Method: GET
- Path: /api/categories/:name/offers
- Success: 200 OK with array of offers

15) Get subcategories by grouping
- Method: GET
- Path: /api/subcategories/grouping/:grouping
- Success: 200 OK with array of subcategories matching grouping

Notes & integration tips
- Admin routes require both authentication (valid JWT) and authorization (ADMIN role). The project uses middleware `ensureAuthWithStatus` and `ensureRole(['ADMIN'])` applied to the admin router.
- Dates passed in offer create/update can be strings; the service will convert them to `Date` objects before saving.
- Bulk initialize endpoint (`/categories/initialize`) accepts an array where each item may include `subcategories` and `offers` arrays; offers inside should include `startDate` and `endDate` as ISO strings or date-parsable strings.
- All endpoints follow typical REST conventions and return standard HTTP status codes.

If you need example response bodies for the frontend (category/subcategory/offer shapes), tell me and I will add concrete examples for each resource type.
