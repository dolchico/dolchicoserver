import prisma from '../lib/prisma.js';

const inspect = async (table) => {
  return prisma.$queryRawUnsafe(
    `SELECT ordinal_position, column_name, is_nullable, column_default, data_type
     FROM information_schema.columns WHERE table_name='${table}' ORDER BY ordinal_position`
  );
};

(async () => {
  try {
    console.log('Categories:');
    const c = await inspect('categories');
    console.table(c);
    console.log('Subcategories:');
    const s = await inspect('subcategories');
    console.table(s);
  } catch (err) {
    console.error('inspect failed', err);
  } finally {
    await prisma.$disconnect();
  }
})();
