#!/usr/bin/env node
/*
  Test script for Coupon API
  Usage:
    BASE_URL=http://localhost:4000 TEST_JWT=<admin-jwt> node scripts/test_coupon_api.js
*/

const axios = require('axios');
const jwt = require('jsonwebtoken');

const BASE = process.env.BASE_URL || 'http://localhost:4000';
const ADMIN_JWT = process.env.TEST_JWT || null; // if provided, used for admin create

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

  // 2. Validate coupon (guest or user)
  await post('/api/coupons/validate', { userId: 10, code: 'TEST10', cartTotal: '120.00', categoryIds: [1] });

  // 3. Apply coupon (reserve)
  await post('/api/cart/apply-coupon', { userId: 10, cartId: 9999, code: 'TEST10' });

  // 4. Remove coupon
  await del('/api/cart/remove-coupon/9999');

  // 5. Validation negative: expired
  await post('/api/coupons/validate', { userId: 10, code: 'NO_SUCH_CODE', cartTotal: '120.00' });

  console.log('Done');
}

run().catch(e => { console.error(e); process.exit(1); });
