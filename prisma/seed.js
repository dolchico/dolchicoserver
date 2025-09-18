// Minimal seed script to satisfy dependencies used by tests/scripts
import prisma from '../lib/prisma.js';

async function main() {
  // create default category and subcategory if not exists
  try {
    // Try Prisma upsert first
    let cat;
    try {
      cat = await prisma.category.upsert({ where: { id: 1 }, update: {}, create: { id: 1, name: 'Default' } });
    } catch (err) {
      // fallback: insert via raw SQL if Prisma model differs
      try {
        await prisma.$executeRawUnsafe("INSERT INTO categories (id, name) VALUES (1, 'Default') ON CONFLICT (id) DO NOTHING");
        cat = await prisma.category.findUnique({ where: { id: 1 } });
      } catch (e) {
        console.warn('Could not create category via raw SQL or Prisma upsert, continuing');
      }
    }

    try {
      await prisma.subcategory.upsert({ where: { id: 1 }, update: {}, create: { id: 1, name: 'Default', categoryId: cat ? cat.id : 1 } });
    } catch (err) {
      try {
        await prisma.$executeRawUnsafe("INSERT INTO subcategories (id, name, categoryId) VALUES (1, 'Default', 1) ON CONFLICT (id) DO NOTHING");
      } catch (e) {
        console.warn('Could not create subcategory via raw SQL or Prisma upsert, continuing');
      }
    }
    console.log('Seed completed (best-effort)');
  } catch (err) {
    console.error('Seed failed', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
