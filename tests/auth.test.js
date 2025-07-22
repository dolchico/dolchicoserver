import { api } from './helpers.js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.test' });

describe('AUTH FLOW', () => {
  const email = `jest_${Date.now()}@mail.com`;
  const password = 'StrongPass123!';

  it('should register a new user', async () => {
    const res = await api.post('/api/auth/register').send({ email, password, name: 'Tester' });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  it('should login the user and return JWT', async () => {
    const res = await api.post('/api/auth/login').send({ email, password });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  it('should reject login with wrong password', async () => {
    const res = await api.post('/api/auth/login').send({ email, password: 'WrongPass!' });
    expect(res.status).toBe(401);
  });

  it('should initiate forgot-password flow', async () => {
    const res = await api.post('/api/auth/forgot-password').send({ email });
    expect(res.status).toBe(200);
  });
});
