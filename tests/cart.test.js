import { api, registerAndLogin } from './helpers.js';

describe('CART FLOW', () => {
  let jwt, productId;

  beforeAll(async () => {
    ({ jwt } = await registerAndLogin());
    // fetch first product id
    const list = await api.get('/api/product');
    productId = list.body.data[0].id;
  });

  it('should add product to cart', async () => {
    const res = await api
      .post('/api/cart')
      .set('Authorization', `Bearer ${jwt}`)
      .send({ productId, quantity: 2, size: '8' });

    expect(res.status).toBe(201);
  });

  it('should get cart items', async () => {
    const res = await api
      .get('/api/cart')
      .set('Authorization', `Bearer ${jwt}`);

    expect(res.status).toBe(200);
    expect(res.body.data.items.length).toBeGreaterThan(0);
  });
});
