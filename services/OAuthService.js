import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// Find account by provider + providerAccountId
export async function findAccount(provider, providerAccountId) {
  return prisma.account.findUnique({
    where: {
      provider_providerAccountId: {
        provider,
        providerAccountId,
      }
    }
  });
}

// Find user by id
export async function findUserById(id) {
  return prisma.user.findUnique({ where: { id: Number(id) } });
}

// Find user by email
export async function findUserByEmail(email) {
  return prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
}

// Create a new user
export async function createUser({ email, name, emailVerified }) {
  return prisma.user.create({
    data: {
      email,
      name,
      emailVerified: !!emailVerified
    }
  });
}

// Link a Google account to a user
export async function linkAccountToUser({ provider, providerAccountId, userId }) {
  return prisma.account.create({
    data: {
      provider,
      providerAccountId,
      userId
    }
  });
}
