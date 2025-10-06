import prisma from '../lib/prisma.js';

export const createOfferType = async (data) => {
  // Additional validation can be added here if needed
  return prisma.offerType.create({ 
    data,
    include: { /* e.g., include related fields if any */ }
  });
};

export const updateOfferType = async (id, data) => {
  return prisma.offerType.update({ 
    where: { id }, 
    data,
    include: { /* e.g., include related fields if any */ }
  });
};

export const deleteOfferType = async (id) => {
  // Soft delete if preferred: update isActive to false
  // return prisma.offerType.update({ where: { id }, data: { isActive: false } });
  return prisma.offerType.delete({ where: { id } });
};

export const listOfferTypes = async (options = {}) => {
  const { where = { isActive: true }, skip = 0, take = 10 } = options;
  return prisma.offerType.findMany({ 
    where, 
    skip, 
    take,
    orderBy: { createdAt: 'desc' },
    include: { /* e.g., include related fields if any */ }
  });
};

export const countOfferTypes = async (options = {}) => {
  const { where = { isActive: true } } = options;
  return prisma.offerType.count({ where });
};

export const getOfferType = async (id) => {
  return prisma.offerType.findUnique({ 
    where: { id },
    include: { /* e.g., include related fields if any */ }
  });
};

export const addOffer = async (categoryId, offerData) => {
  console.log('Checking uniqueness for title:', offerData.title, 'in categoryId:', parsedCategoryId);
console.log('Existing offers in category:', await prisma.offer.count({ where: { categoryId: parsedCategoryId } }));
  const parsedCategoryId = parseInt(categoryId, 10); // Ensure integer for DB match
  if (isNaN(parsedCategoryId)) {
    throw new Error('Invalid category ID provided');
  }

  // Uniqueness check: Filter by BOTH title AND categoryId
  const existingOffer = await prisma.offer.findFirst({
    where: {
      title: offerData.title, // Assuming title is the unique field
      categoryId: parsedCategoryId, // This was likely missing!
    },
  });

  if (existingOffer) {
    throw new Error('An offer with this title already exists for the selected category');
  }

  // Create the offer
  const offer = await prisma.offer.create({
    data: {
      ...offerData,
      categoryId: parsedCategoryId,
      // Handle offerRules if nested
      offerRules: {
        create: offerData.offerRules || [], // Assuming offerRules is an array in payload
      },
    },
    include: {
      offerRules: true, // Include for full response
    },
  });

  return offer;
};