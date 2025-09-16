Coupon API Integration Guide

Base paths used by this project:
- Admin operations: POST /api/admin/coupons
- Public/Cart operations: /api/coupons/validate, /api/cart/apply-coupon, /api/cart/remove-coupon/:cartId

Endpoints

1) Create coupon (Admin)
- POST /api/admin/coupons
- Body (example):
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
- Success: 201 Created with coupon object

2) Validate coupon
- POST /api/coupons/validate
- Body (example):
{
  "userId": 123,
  "code": "SUMMER20",
  "cartTotal": "150.00",
  "categoryIds": [1]
}
- Success: { valid: true, discount: "30.00" }
- Possible error reasons: NOT_FOUND, INACTIVE, NOT_STARTED, EXPIRED, MIN_ORDER_NOT_MET, CATEGORY_MISMATCH, USAGE_LIMIT_EXCEEDED, USER_USAGE_LIMIT_EXCEEDED

3) Apply coupon (reserve usage)
- POST /api/cart/apply-coupon
- Body (example):
{
  "userId": 123,
  "cartId": 456,
  "code": "SUMMER20"
}
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

If you want, I can:
- Add example Order service snippets showing how to finalize a coupon usage and create an OrderCoupon row.
- Add extra endpoints for listing coupons or getting coupon details.
