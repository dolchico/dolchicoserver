import prisma from '../lib/prisma.js';

(async () => {
  try {
  await prisma.$executeRawUnsafe(`INSERT INTO categories (id, name, "isActive", "createdAt", "updatedAt", "imageUrl", description) VALUES (1,'Default', true, now(), now(), NULL, NULL) ON CONFLICT (id) DO NOTHING`);
  await prisma.$executeRawUnsafe(`INSERT INTO subcategories (id, name, grouping, "categoryId", "isActive", "createdAt", "updatedAt") VALUES (1,'Default','Default Group',1, true, now(), now()) ON CONFLICT (id) DO NOTHING`);
    console.log('Inserted categories/subcategories');
  } catch (err) {
    console.error('Insert failed', err);
  } finally {
    await prisma.$disconnect();
  }
})();
