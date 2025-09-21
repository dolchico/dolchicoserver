#!/usr/bin/env node
/**
 * Simple Node script to exercise the reviews service.
 * Usage: node scripts/reviews_test.js
 * Ensure DATABASE_URL and JWT_SECRET are set in your environment.
 */
import prisma from '../lib/prisma.js';
import service from '../services/reviewService.js';

const run = async () => {
  console.log('Starting reviews smoke script...');
  try {
    // Clear small set of tables (careful in prod!)
    await prisma.$executeRawUnsafe('TRUNCATE TABLE "reviews" RESTART IDENTITY CASCADE');
    await prisma.$executeRawUnsafe('TRUNCATE TABLE "order_items" RESTART IDENTITY CASCADE');
    await prisma.$executeRawUnsafe('TRUNCATE TABLE "orders" RESTART IDENTITY CASCADE');
    await prisma.$executeRawUnsafe('TRUNCATE TABLE "products" RESTART IDENTITY CASCADE');
    await prisma.$executeRawUnsafe('TRUNCATE TABLE "users" RESTART IDENTITY CASCADE');

    // Seed minimal fixtures
    const alice = await prisma.user.create({ data: { name: 'Alice', email: 'alice@example.com' } });
    const bob = await prisma.user.create({ data: { name: 'Bob', email: 'bob@example.com' } });
    const admin = await prisma.user.create({ data: { name: 'Admin', email: 'admin@example.com', role: 'ADMIN' } });

    const p1 = await prisma.product.create({ data: { name: 'P1', description: 'Prod1', price: 10, image: [], categoryId: 1, subcategoryId: 1, sizes: [], date: Date.now() } });

    const o1 = await prisma.order.create({ data: { userId: alice.id, amount: 10, address: {}, status: 'DELIVERED', paymentMethod: 'COD', payment: true, date: Date.now() } });
    await prisma.orderItem.create({ data: { orderId: o1.id, productId: p1.id, size: 'M', quantity: 1, price: 10 } });

    // Alice creates a product review
    try {
      const r = await service.createReview({ type: 'PRODUCT', productId: p1.id, rating: 5, title: 'Great' }, alice.id);
      console.log('Created review:', r.id);
    } catch (err) {
      console.error('Create review failed:', err);
    }

    // Try duplicate
    try {
      await service.createReview({ type: 'PRODUCT', productId: p1.id, rating: 4 }, alice.id);
    } catch (err) {
      console.log('Expected duplicate error:', err.message || err);
    }

    // Update review
    const review = await prisma.review.findFirst({ where: { userId: alice.id } });
    const updated = await service.updateReview(review.id, { rating: 4, comment: 'Updated' }, { id: alice.id, role: 'USER' });
    console.log('Updated review rating:', updated.rating, 'isEdited:', updated.isEdited);

  // Check product aggregates before delete
  const productBefore = await prisma.product.findUnique({ where: { id: p1.id } });
  console.log('Product aggregates BEFORE delete:', productBefore.reviewsCount, productBefore.averageRating);

  // Soft delete
  await service.deleteReview(review.id, { id: alice.id, role: 'USER' });
  const exists = await prisma.review.findUnique({ where: { id: review.id } });
  console.log('After delete isDeleted:', exists.isDeleted);

  // Product aggregates after delete
  const productAfter = await prisma.product.findUnique({ where: { id: p1.id } });
  console.log('Product aggregates AFTER delete:', productAfter.reviewsCount, productAfter.averageRating);

  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
};

run();
