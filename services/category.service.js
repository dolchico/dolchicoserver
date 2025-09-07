import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// Helper to find a category by ID or name
const findCategory = async (identifier) => {
  const isNumeric = !isNaN(parseFloat(identifier)) && isFinite(identifier);
  const where = isNumeric ? { id: parseInt(identifier, 10) } : { name: identifier };
  const category = await prisma.category.findUnique({ where });
  if (!category) throw new Error('Category not found');
  return category;
};

// --- Category Services ---
export const createCategory = async (categoryData) => {
  return prisma.category.create({ data: categoryData });
};

export const updateCategory = async (id, categoryData) => {
  return prisma.category.update({ where: { id: parseInt(id, 10) }, data: categoryData });
};

export const deleteCategory = async (id) => {
  return prisma.category.delete({ where: { id: parseInt(id, 10) } });
};

export const getAllCategories = async () => {
  return prisma.category.findMany({
    where: { isActive: true },
    include: { subcategories: true, offers: true },
  });
};

export const getCategoryByName = async (name) => {
  return prisma.category.findUnique({
    where: { name },
    include: { subcategories: true, offers: true },
  });
};

// --- Subcategory Services ---
export const addSubcategory = async (categoryId, subcategoryData) => {
  return prisma.subcategory.create({
    data: { ...subcategoryData, categoryId: parseInt(categoryId, 10) },
  });
};

export const updateSubcategory = async (id, subcategoryData) => {
  return prisma.subcategory.update({ where: { id: parseInt(id, 10) }, data: subcategoryData });
};

export const deleteSubcategory = async (id) => {
  return prisma.subcategory.delete({ where: { id: parseInt(id, 10) } });
};

export const getSubcategoriesByCategoryName = async (categoryName) => {
    const category = await findCategory(categoryName);
    return prisma.subcategory.findMany({ where: { categoryId: category.id } });
};

export const getSubcategoriesByGrouping = async (grouping) => {
    return prisma.subcategory.findMany({ where: { grouping, isActive: true } });
};


// --- Offer Services ---
export const addOffer = async (categoryId, offerData) => {
    // Convert string dates to ISO format if necessary
    if(offerData.startDate) offerData.startDate = new Date(offerData.startDate);
    if(offerData.endDate) offerData.endDate = new Date(offerData.endDate);

    return prisma.offer.create({
        data: { ...offerData, categoryId: parseInt(categoryId, 10) },
    });
};

export const updateOffer = async (id, offerData) => {
    if(offerData.startDate) offerData.startDate = new Date(offerData.startDate);
    if(offerData.endDate) offerData.endDate = new Date(offerData.endDate);
    return prisma.offer.update({ where: { id: parseInt(id, 10) }, data: offerData });
};

export const deleteOffer = async (id) => {
    return prisma.offer.delete({ where: { id: parseInt(id, 10) } });
};

export const getOffersByCategoryName = async (categoryName) => {
    const category = await findCategory(categoryName);
    return prisma.offer.findMany({ where: { categoryId: category.id, isActive: true } });
};


// --- Bulk Initialization Service ---
export const initializeData = async (data) => {
  const createdCategories = [];
  
  for (const cat of data) {
    const { subcategories, offers, ...categoryData } = cat;
    
    const newCategory = await prisma.category.create({
      data: {
        ...categoryData,
        subcategories: {
          create: subcategories || [],
        },
        offers: {
          create: (offers || []).map(o => ({
            ...o,
            startDate: new Date(o.startDate),
            endDate: new Date(o.endDate)
          })),
        },
      },
      include: { subcategories: true, offers: true },
    });

    createdCategories.push(newCategory);
  }
  
  return createdCategories;
};