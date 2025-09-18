import prisma from '../lib/prisma.js';
import jwt from 'jsonwebtoken';
import fs from 'fs';

export const clearDb = async () => {
  // Truncate reviews and related tables used in tests
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "reviews" RESTART IDENTITY CASCADE');
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "order_items" RESTART IDENTITY CASCADE');
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "orders" RESTART IDENTITY CASCADE');
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "products" RESTART IDENTITY CASCADE');
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "users" RESTART IDENTITY CASCADE');
};

export const seedFixtures = async () => {
  // Create users
  const alice = await prisma.user.create({ data: { name: 'Alice', email: 'alice@example.com' } });
  const bob = await prisma.user.create({ data: { name: 'Bob', email: 'bob@example.com' } });
  const admin = await prisma.user.create({ data: { name: 'Admin', email: 'admin@example.com', role: 'ADMIN' } });

  // Products
  const p1 = await prisma.product.create({ data: { name: 'P1', description: 'Prod1', price: 10, image: [], categoryId: 1, subcategoryId: 1, sizes: [], date: Date.now() } });
  const p2 = await prisma.product.create({ data: { name: 'P2', description: 'Prod2', price: 20, image: [], categoryId: 1, subcategoryId: 1, sizes: [], date: Date.now() } });

  // Orders: o1 alice DELIVERED with p1, o2 alice PAID with p2
  const o1 = await prisma.order.create({ data: { userId: alice.id, amount: 10, address: {}, status: 'DELIVERED', paymentMethod: 'COD', payment: true, date: Date.now() } });
  const o2 = await prisma.order.create({ data: { userId: alice.id, amount: 20, address: {}, status: 'ORDER_PLACED', paymentMethod: 'COD', payment: true, date: Date.now() } });
  const o3 = await prisma.order.create({ data: { userId: bob.id, amount: 10, address: {}, status: 'DELIVERED', paymentMethod: 'COD', payment: true, date: Date.now() } });

  await prisma.orderItem.create({ data: { orderId: o1.id, productId: p1.id, size: 'M', quantity: 1, price: 10 } });
  await prisma.orderItem.create({ data: { orderId: o2.id, productId: p2.id, size: 'M', quantity: 1, price: 20 } });
  await prisma.orderItem.create({ data: { orderId: o3.id, productId: p1.id, size: 'M', quantity: 1, price: 10 } });

  return { alice, bob, admin, p1, p2, o1, o2, o3 };
};

export const authHeader = (user) => {
  const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET || 'testsecret');
  return `Bearer ${token}`;
};
