import { api, registerAndLogin } from './helpers.js';

describe('ORDER FLOW', () => {
  let jwt;

  beforeAll(async () => ({ jwt } = await registerAndLogin()));

  it('should place an order', async () => {
    const res = await api
      .post('/api/order')
      .set('Authorization', `Bearer ${jwt}`)
      .send({
        paymentMethod: 'COD',
        address: { line1: '123 Test St', city: 'NY', zip: '10001' }
      });

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('ORDER_PLACED');
  });

  it('should list user orders', async () => {
    const res = await api
      .get('/api/order')
      .set('Authorization', `Bearer ${jwt}`);

    expect(res.status).toBe(200);
    expect(res.body.data.orders.length).toBeGreaterThan(0);
  });
});
