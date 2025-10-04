// debug-offerrules.js

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function resetSequences() {
  try {
    // await prisma.$executeRaw`ALTER SEQUENCE categories_id_seq RESTART WITH 1;`;
    // await prisma.$executeRaw`ALTER SEQUENCE subcategories_id_seq RESTART WITH 1;`;
    // await prisma.$executeRaw`ALTER SEQUENCE offers_id_seq RESTART WITH 1;`;
    // await prisma.$executeRaw`ALTER SEQUENCE offer_rules_id_seq RESTART WITH 1;`;
    await prisma.$executeRaw`ALTER SEQUENCE product_id_seq RESTART WITH 1;`;
    console.log('Auto-increment sequences reset successfully.');
  } catch (error) {
    console.error('Error resetting sequences:', error);
  } finally {
    await prisma.$disconnect();
  }
}

resetSequences();