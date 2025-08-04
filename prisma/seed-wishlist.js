import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Add some sample wishlist items if you have existing users and products
  const users = await prisma.user.findMany({ take: 2 });
  const products = await prisma.product.findMany({ take: 5 });
  
  if (users.length > 0 && products.length > 0) {
    await prisma.wishlist.createMany({
      data: [
        {
          userId: users[0].id,
          productId: products[0].id
        },
        {
          userId: users[0].id,
          productId: products[1].id
        }
      ],
      skipDuplicates: true
    });
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
