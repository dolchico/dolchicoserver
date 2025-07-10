// services/userService.js
import prisma from '../lib/prisma.js';

export const findUserByEmail = async (email) => {
  return await prisma.user.findUnique({ where: { email } });
};

export const createUser = async (userData) => {
  return await prisma.user.create({ data: userData });
};
