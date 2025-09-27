import { PrismaClient } from '@prisma/client';
import { generateSKU } from '../utils/inventoryUtils.js';

const prisma = new PrismaClient();

async function backfill() {
  try {
  console.log('Fetching products without SKU (using raw SQL to avoid null-filter validation)...');
  // Use a raw SQL query because Prisma's filter API disallows `sku: null` when the schema has sku non-nullable in the generated client.
  const products = await prisma.$queryRaw`SELECT id, "categoryId", "subcategoryId" FROM products WHERE sku IS NULL`;
    console.log(`Found ${products.length} products to update.`);

    for (const p of products) {
      // load category and subcategory names
      const [category, subcategory] = await Promise.all([
        prisma.category.findUnique({ where: { id: p.categoryId }, select: { name: true } }),
        prisma.subcategory.findUnique({ where: { id: p.subcategoryId }, select: { name: true } }),
      ]);

      const sku = generateSKU((category && category.name) || 'CAT', (subcategory && subcategory.name) || 'SUB', p.id);
      try {
        await prisma.product.update({ where: { id: p.id }, data: { sku } });
        console.log(`Updated product ${p.id} -> ${sku}`);
      } catch (err) {
        console.error(`Failed to update product ${p.id}:`, err.message);
      }
    }

    console.log('Backfill complete.');
  } catch (err) {
    console.error('Backfill failed:', err);
  } finally {
    await prisma.$disconnect();
  }
}

backfill();
