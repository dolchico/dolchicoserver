  import { PrismaClient } from '@prisma/client';
  const prisma = new PrismaClient();

  async function truncateProducts() {
    try {
      await prisma.$executeRaw`TRUNCATE TABLE products CASCADE;`;
      console.log('Products table truncated successfully.');
    } catch (error) {
      console.error('Error truncating products table:', error);
      throw error;
    } finally {
      await prisma.$disconnect();
    }
  }

  truncateProducts();