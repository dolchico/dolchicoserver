import { api, registerAndLogin } from './helpers.js';

describe('USER PROFILE', () => {
  let jwt;
  beforeAll(async () => ({ jwt } = await registerAndLogin()));

  it('should fetch profile with JWT', async () => {
    const res = await api
      .get('/api/auth/profile')
      .set('Authorization', `Bearer ${jwt}`);

    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBeDefined();
  });

  it('should update profile details', async () => {
    const res = await api
      .put('/api/auth/profile')
      .set('Authorization', `Bearer ${jwt}`)
      .send({ firstName: 'Unit', lastName: 'Test' });

    expect(res.status).toBe(200);
    expect(res.body.data.user.firstName).toBe('Unit');
  });
});
