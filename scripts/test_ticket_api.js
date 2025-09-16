import axios from 'axios';
import jwt from 'jsonwebtoken';

const BASE = process.env.BASE_URL || 'http://localhost:4000/api/generateticket';
// Provided JWT string (can be overridden by TEST_JWT env)
const PROVIDED_JWT = process.env.TEST_JWT || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MiwiaWF0IjoxNzU4MDE0MjE5LCJleHAiOjE3NTg2MTkwMTl9.U9aTJ8uwZUwLIivwHleW5kEZS6mEGfYFr6M4UmZ24h4';
const JWT_SECRET = process.env.JWT_SECRET || 'shhhhh';

async function post(body, token) {
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await axios.post(BASE, body, { headers, validateStatus: () => true });
    console.log('Request:', JSON.stringify(body));
    console.log('Status:', res.status);
    console.log('Response:', JSON.stringify(res.data));
    console.log('---\n');
  } catch (err) {
    console.error('Network or unexpected error:', err.message);
  }
}

function makeToken(sub) {
  return jwt.sign({ sub }, JWT_SECRET, { expiresIn: '1h' });
}

async function run() {
  console.log('Testing endpoint:', BASE);

  // 1. Happy path guest (mixed actions)
  await post({
    fullName: 'Akash Kulshrestha',
    email: 'akashthanda14@gmail.com',
    subject: 'Issue with my order',
    message: 'Some products in my order need refund or replacement.',
    orderId: 5001,
    products: [
      { productId: 101, productName: 'Wireless Mouse', action: 'Replacement' },
      { productId: 102, productName: 'Keyboard', action: 'Refund' }
    ]
  });

  // 2. Happy path authenticated (userId from token) — use provided JWT if present
  const token = PROVIDED_JWT || makeToken(123);
  await post({
    fullName: 'Auth User',
    email: 'auth@example.com',
    subject: 'Replacement only',
    message: 'Please replace the item.',
    products: [ { productId: 201, productName: 'Item A', action: 'Replacement' } ]
  }, token);

  // 3. Auth mismatch (body userId different from token)
  const tok2 = makeToken(999);
  await post({
    fullName: 'Mismatch',
    email: 'mm@example.com',
    subject: 'Mismatch',
    message: 'This should fail due to user id mismatch',
    userId: 1
  }, tok2);

  // 4. Validation error (short fullName and invalid email)
  await post({
    fullName: 'A',
    email: 'not-an-email',
    subject: 'Hi',
    message: 'short'
  });

  // 5. Refund only products
  await post({
    fullName: 'Refund Only',
    email: 'refund@example.com',
    subject: 'Refund request',
    message: 'Please refund me',
    products: [ { productId: 301, productName: 'Old Item', action: 'Refund' } ]
  });

  // 6. Unknown field should return 400
  await post({
    fullName: 'Unknown Field',
    email: 'u@example.com',
    subject: 'Unknown',
    message: 'Has unknown',
    extraField: 'not allowed'
  });
}

run();
