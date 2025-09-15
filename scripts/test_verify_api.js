/*
Simple test script to POST to /api/payment/verify-api
Usage:
  NODE_ENV=development BASE_URL=http://localhost:3000 node scripts/test_verify_api.js

It will send sample razorpay_order_id and razorpay_payment_id from env overrides or defaults.
*/

import fetch from 'node-fetch';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const PATH = '/api/payment/verify-api';

const razorpay_order_id = process.env.RAZORPAY_ORDER_ID || 'order_TEST_123';
const razorpay_payment_id = process.env.RAZORPAY_PAYMENT_ID || 'pay_TEST_456';
// Use provided token by default unless TEST_AUTH_TOKEN env var overrides it
const AUTH_TOKEN = process.env.TEST_AUTH_TOKEN || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MiwiaWF0IjoxNzU3OTY4OTE0LCJleHAiOjE3NTg1NzM3MTR9.wfdqgaZcfoEep_1W-oL9LCZ8t__bsYu3trOu-8shK8M';

(async () => {
  try {
    const url = `${BASE_URL}${PATH}`;
    console.log('Posting to', url);

    const body = { razorpay_order_id, razorpay_payment_id };

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(AUTH_TOKEN ? { Authorization: `Bearer ${AUTH_TOKEN}` } : {})
      },
      body: JSON.stringify(body)
    });

    const text = await res.text();
    console.log('Status:', res.status);
    try {
      const data = JSON.parse(text);
      console.log('Response JSON:', JSON.stringify(data, null, 2));
    } catch (e) {
      console.log('Response text:', text);
    }
  } catch (error) {
    console.error('Test script error:', error);
    process.exit(1);
  }
})();
