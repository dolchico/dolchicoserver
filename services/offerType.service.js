import prisma from '../lib/prisma.js';

export const createOfferType = async (data) => {
  return prisma.offerType.create({ data });
};

export const updateOfferType = async (id, data) => {
  return prisma.offerType.update({ where: { id: parseInt(id, 10) }, data });
};

export const deleteOfferType = async (id) => {
  return prisma.offerType.delete({ where: { id: parseInt(id, 10) } });
};

export const listOfferTypes = async () => {
  return prisma.offerType.findMany({ where: { isActive: true } });
};

export const getOfferType = async (id) => {
  return prisma.offerType.findUnique({ where: { id: parseInt(id, 10) } });
};
