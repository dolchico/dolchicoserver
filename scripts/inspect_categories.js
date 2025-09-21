import prisma from '../lib/prisma.js';

(async () => {
  try {
    const cols = await prisma.$queryRawUnsafe("SELECT column_name, is_nullable FROM information_schema.columns WHERE table_name='categories'");
    console.log(cols);
  } catch (err) {
    console.error('inspect failed', err);
  } finally {
    await prisma.$disconnect();
  }
})();
