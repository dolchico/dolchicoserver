#!/usr/bin/env node
/*
  Test script for Coupon API (ESM version)
  Usage:
    BASE_URL=http://localhost:4000 TEST_JWT=<admin-jwt> USER_JWT=<user-jwt> node scripts/test_coupon_api.js
*/

import axios from 'axios';

const BASE = process.env.BASE_URL || 'http://localhost:4000';
// Defaults can be overridden by environment variables
const ADMIN_JWT = process.env.TEST_JWT || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImFkbWluQGV4YW1wbGUuY29tIiwiaWF0IjoxNzU4MDU4NzA5LCJleHAiOjE3NTg2NjM1MDl9.xVPLZqZsWJWVPsphibgAVyXUUUutua_j8fho2nRsp2c'; // user-provided admin token
const USER_JWT = process.env.USER_JWT || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MiwiaWF0IjoxNzU4MDU4Nzk0LCJleHAiOjE3NTg2NjM1OTR9.NKBVXiuyH5WE4F19up_478lvW-FbjymbQw7GnNuBlQ0';

async function post(path, body, token) {
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await axios.post(BASE + path, body, { headers, validateStatus: () => true });
    console.log(`POST ${path} -> ${res.status}`);
    console.log(JSON.stringify(res.data, null, 2));
    return res;
  } catch (err) {
    console.error('Network error', err.message);
    throw err;
  }
}

async function del(path, token) {
  try {
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await axios.delete(BASE + path, { headers, validateStatus: () => true });
    console.log(`DELETE ${path} -> ${res.status}`);
    console.log(JSON.stringify(res.data, null, 2));
    return res;
  } catch (err) {
    console.error('Network error', err.message);
    throw err;
  }
}

async function run() {
  console.log('Testing Coupon API at', BASE);

  // 1. Create coupon (admin)
  const couponPayload = {
    code: 'TEST10',
    name: 'Test Coupon 10% Off',
    type: 'PERCENTAGE',
    discountValue: '10',
    minOrderValue: '50.00',
    maxDiscountAmount: '25.00',
    usageLimitTotal: 100,
    usageLimitPerUser: 2,
    validFrom: new Date(Date.now() - 60*60*1000).toISOString(),
    validUntil: new Date(Date.now() + 24*60*60*1000).toISOString(),
    isActive: true,
    isNewUserOnly: false,
    categoryIds: [1,2]
  };

  const createResp = await post('/api/admin/coupons', couponPayload, ADMIN_JWT);
  const createdCoupon = createResp.data;

  // 2. Validate coupon (as a user)
  await post('/api/coupons/validate', { userId: 10, code: 'TEST10', cartTotal: '120.00', categoryIds: [1] }, USER_JWT);

  // 3. Apply coupon (reserve) as user
  await post('/api/cart/apply-coupon', { userId: 10, cartId: 9999, code: 'TEST10' }, USER_JWT);

  // 4. Remove coupon (user) - pass user token for auth if required
  await del('/api/cart/remove-coupon/9999', USER_JWT);

  // 5. Validation negative: expired or not found
  await post('/api/coupons/validate', { userId: 10, code: 'NO_SUCH_CODE', cartTotal: '120.00' }, USER_JWT);

  console.log('Done');
}

run().catch(e => { console.error(e); process.exit(1); });
