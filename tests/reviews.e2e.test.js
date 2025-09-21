import request from 'supertest';
import app from '../server.js';
import prisma from '../lib/prisma.js';
import { clearDb, seedFixtures, authHeader } from './testUtils.js';

let fixtures;

beforeAll(async () => {
  // Ensure migrations applied externally (tests expect schema present)
});

beforeEach(async () => {
  await clearDb();
  fixtures = await seedFixtures();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('Reviews E2E', () => {
  test('POST /api/reviews PRODUCT succeeds for purchaser', async () => {
    const { alice, p1 } = fixtures;
    const res = await request(app)
      .post('/api/reviews')
      .set('Authorization', authHeader(alice))
      .send({ type: 'PRODUCT', productId: p1.id, rating: 5, title: 'Great', comment: 'Nice' });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
  });

  test('POST /api/reviews PRODUCT fails 422 if not purchased', async () => {
    const { alice, p2 } = fixtures;
    const res = await request(app)
      .post('/api/reviews')
      .set('Authorization', authHeader(alice))
      .send({ type: 'PRODUCT', productId: p2.id, rating: 4 });
    expect(res.status).toBe(422);
  });

  test('POST duplicate review returns 409', async () => {
    const { alice, p1 } = fixtures;
    const agent = request(app);
    await agent.post('/api/reviews').set('Authorization', authHeader(alice)).send({ type: 'PRODUCT', productId: p1.id, rating: 5 });
    const res = await agent.post('/api/reviews').set('Authorization', authHeader(alice)).send({ type: 'PRODUCT', productId: p1.id, rating: 4 });
    expect(res.status).toBe(409);
  });

  test('POST /api/reviews DELIVERY succeeds for delivered order', async () => {
    const { alice, o1 } = fixtures;
    const res = await request(app).post('/api/reviews').set('Authorization', authHeader(alice)).send({ type: 'DELIVERY', orderId: o1.id, rating: 5 });
    expect(res.status).toBe(201);
  });

  test('POST /api/reviews DELIVERY fails for not delivered', async () => {
    const { alice, o2 } = fixtures;
    const res = await request(app).post('/api/reviews').set('Authorization', authHeader(alice)).send({ type: 'DELIVERY', orderId: o2.id, rating: 4 });
    expect(res.status).toBe(422);
  });

  test('PATCH review owner can update and isEdited true', async () => {
    const { alice, p1 } = fixtures;
    const create = await request(app).post('/api/reviews').set('Authorization', authHeader(alice)).send({ type: 'PRODUCT', productId: p1.id, rating: 5 });
    const id = create.body.id;
    const res = await request(app).patch(`/api/reviews/${id}`).set('Authorization', authHeader(alice)).send({ rating: 3, comment: 'updated' });
    expect(res.status).toBe(200);
    expect(res.body.isEdited).toBe(true);
    expect(res.body.rating).toBe(3);
  });

  test('DELETE review soft deletes and aggregates update', async () => {
    const { alice, p1 } = fixtures;
    const create = await request(app).post('/api/reviews').set('Authorization', authHeader(alice)).send({ type: 'PRODUCT', productId: p1.id, rating: 5 });
    const id = create.body.id;
    const del = await request(app).delete(`/api/reviews/${id}`).set('Authorization', authHeader(alice));
    expect(del.status).toBe(200);
    const list = await request(app).get(`/api/products/${p1.id}`).send();
    expect(list.status).toBe(200);
    expect(list.body.meta.reviewsCount).toBe(0);
  });
});
