import request from 'supertest';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.test' });

export const api = request(process.env.BASE_URL);

export const registerAndLogin = async () => {
  const { TEST_USER_EMAIL, TEST_USER_PASSWORD } = process.env;

  // Register (idempotent)
  await api.post('/api/auth/register').send({
    email: TEST_USER_EMAIL,
    password: TEST_USER_PASSWORD,
    name: 'Jest Tester'
  });

  // Login → get JWT + session cookie
  const res = await api
    .post('/api/auth/login')
    .send({ email: TEST_USER_EMAIL, password: TEST_USER_PASSWORD });

  const jwt = res.body?.token;
  const cookie = res.headers['set-cookie']?.[0];
  return { jwt, cookie };
};
