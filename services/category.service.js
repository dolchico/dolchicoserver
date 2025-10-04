import { PrismaClient, Prisma } from '@prisma/client';
const prisma = new PrismaClient();

// Helper to find a category by ID or name
const findCategory = async (identifier) => {
  const isNumeric = !isNaN(parseFloat(identifier)) && isFinite(identifier);
  const where = isNumeric ? { id: parseInt(identifier, 10) } : { name: identifier };
  const category = await prisma.category.findUnique({ where });
  if (!category) throw new Error('Category not found');
  return category;
};

const findSubcategoryByName = async (categoryId, name) => {
  if (!name) return null;
  return prisma.subcategory.findFirst({ where: { categoryId: parseInt(categoryId, 10), name } });
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
    include: { 
      subcategories: true, 
      offers: { 
        include: { 
          offerRules: true 
        } 
      } 
    },
  });
};

export const getCategoryByName = async (name) => {
  return prisma.category.findUnique({
    where: { name },
    include: { 
      subcategories: true, 
      offers: { 
        include: { 
          offerRules: true
        } 
      } 
    },
  });
};

// --- Subcategory Services ---
export const addSubcategory = async (categoryId, subcategoryData) => {
  try {
    const parsedCategoryId = parseInt(categoryId, 10);
    if (isNaN(parsedCategoryId)) {
      throw new Error('Invalid category ID');
    }

    const { name, grouping, isActive, imageUrl } = subcategoryData;

    if (!name || !grouping?.trim()) {
      throw new Error('Name and non-empty grouping are required');
    }

    return await prisma.subcategory.create({
      data: {
        name,
        grouping,
        isActive: isActive ?? true,
        categoryId: parsedCategoryId,
        imageUrl: imageUrl || null,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new Error('Subcategory with this name already exists for the selected category');
    }
    throw error;
  }
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
  try {
    const parsedCategoryId = parseInt(categoryId, 10);
    if (isNaN(parsedCategoryId)) {
      throw new Error('Invalid category ID');
    }

    // Explicitly select valid Offer fields
    const {
      title,
      description,
      discountPercent,
      iconUrl,
      isActive,
      startDate,
      endDate,
      offerRules,
      // Rule-related fields that may be sent at top level
      minDiscount,
      maxDiscount,
      priceAbove,
      priceBelow,
      tags,
      subcategoryId,
      subCategoriesName,
      subcategoryName,
      // Ignore invalid fields
      grouping,
      discountType,
      ...invalidFields
    } = offerData;

    // Validate required Offer fields
    if (!title || !discountPercent || !startDate || !endDate) {
      throw new Error('Title, discountPercent, startDate, and endDate are required');
    }

    // Prepare Offer data
    const data = {
      title,
      description,
      discountPercent: parseFloat(discountPercent),
      iconUrl: iconUrl || null,
      isActive: isActive ?? true,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      categoryId: parsedCategoryId,
    };

    // Handle offerRules
    let nestedRules = [];
    if (Array.isArray(offerRules) && offerRules.length) {
      for (const r of offerRules) {
        const rule = { ...r };
        if (r.subCategoriesName || r.subcategoryName) {
          const name = r.subCategoriesName || r.subcategoryName;
          const sub = await findSubcategoryByName(categoryId, name);
          if (sub) rule.subcategoryId = sub.id;
          delete rule.subCategoriesName;
          delete rule.subcategoryName;
        }
        nestedRules.push({
          priceBelow: rule.priceBelow ?? rule.price_below ?? undefined,
          priceAbove: rule.priceAbove ?? rule.price_above ?? undefined,
          minDiscount: rule.minDiscount ?? rule.min_discount ?? undefined,
          maxDiscount: rule.maxDiscount ?? rule.max_discount ?? undefined,
          ageGroupStart: rule.ageGroupStart ?? undefined,
          ageGroupEnd: rule.ageGroupEnd ?? undefined,
          tags: rule.tags ?? [],
          subcategoryId: rule.subcategoryId ?? undefined,
        });
      }
    }

    // If rule-related fields are provided at top level, add them as a single rule
    if (
      minDiscount !== undefined ||
      maxDiscount !== undefined ||
      priceAbove !== undefined ||
      priceBelow !== undefined ||
      tags !== undefined ||
      subcategoryId !== undefined ||
      subCategoriesName ||
      subcategoryName
    ) {
      const rule = {
        minDiscount: minDiscount ? parseInt(minDiscount, 10) : undefined,
        maxDiscount: maxDiscount ? parseInt(maxDiscount, 10) : undefined,
        priceAbove: priceAbove ? parseFloat(priceAbove) : undefined,
        priceBelow: priceBelow ? parseFloat(priceBelow) : undefined,
        tags: Array.isArray(tags) ? tags : tags ? JSON.parse(tags) : [],
        subcategoryId,
      };

      if (subCategoriesName || subcategoryName) {
        const name = subCategoriesName || subcategoryName;
        const sub = await findSubcategoryByName(categoryId, name);
        if (sub) rule.subcategoryId = sub.id;
      }

      // Only add rule if it has meaningful data
      if (
        rule.minDiscount !== undefined ||
        rule.maxDiscount !== undefined ||
        rule.priceAbove !== undefined ||
        rule.priceBelow !== undefined ||
        rule.tags.length > 0 ||
        rule.subcategoryId !== undefined
      ) {
        nestedRules.push(rule);
      }
    }

    if (nestedRules.length > 0) {
      data.offerRules = { create: nestedRules };
    }

    // Log invalid fields for debugging
    if (Object.keys(invalidFields).length > 0) {
      console.warn('Ignoring invalid Offer fields:', Object.keys(invalidFields));
    }

    return await prisma.offer.create({ data, include: { offerRules: true } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new Error('An offer with this title already exists for the selected category');
    }
    throw error;
  }
};

export const updateOffer = async (id, offerData) => {
  if (offerData.startDate) offerData.startDate = new Date(offerData.startDate);
  if (offerData.endDate) offerData.endDate = new Date(offerData.endDate);
  const { offerRules, ...rest } = offerData;
  const data = { ...rest };

  if (Array.isArray(offerRules)) {
    const existingOffer = await prisma.offer.findUnique({ where: { id: parseInt(id, 10) }, select: { id: true, categoryId: true } });
    if (!existingOffer) throw new Error('Offer not found');

    const existingRules = await prisma.offerRule.findMany({ where: { offerId: existingOffer.id } });
    const existingIds = new Set(existingRules.map(r => r.id));

    const txOps = [];
    const incomingIds = new Set();

    for (const r of offerRules) {
      let resolvedSubcategoryId = r.subcategoryId;
      const name = r.subCategoriesName || r.subcategoryName;
      if (!resolvedSubcategoryId && name) {
        const sub = await findSubcategoryByName(existingOffer.categoryId, name);
        if (sub) resolvedSubcategoryId = sub.id;
      }

      const ruleData = {
        priceBelow: r.price_below ?? r.priceBelow ?? undefined,
        priceAbove: r.price_above ?? r.priceAbove ?? undefined,
        minDiscount: r.min_discount ?? r.minDiscount ?? undefined,
        maxDiscount: r.max_discount ?? r.maxDiscount ?? undefined,
        ageGroupStart: r.ageGroupStart ?? undefined,
        ageGroupEnd: r.ageGroupEnd ?? undefined,
        tags: r.tags ?? [],
        subcategoryId: resolvedSubcategoryId ?? undefined,
      };

      if (r.id && existingIds.has(r.id)) {
        incomingIds.add(r.id);
        txOps.push(prisma.offerRule.update({ where: { id: r.id }, data: ruleData }));
      } else {
        txOps.push(prisma.offerRule.create({ data: { ...ruleData, offerId: existingOffer.id } }));
      }
    }

    for (const er of existingRules) {
      if (!incomingIds.has(er.id)) {
        txOps.push(prisma.offerRule.delete({ where: { id: er.id } }));
      }
    }

    if (txOps.length) {
      await prisma.$transaction(txOps);
    }
  }

  return prisma.offer.update({ where: { id: parseInt(id, 10) }, data, include: { offerRules: true } });
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
          create: (subcategories || []).map(sub => ({
            name: sub.name,
            imageUrl: sub.imageUrl,
            grouping: sub.grouping,
            isActive: sub.isActive ?? true
          })),
        },
      },
      include: { 
        subcategories: true
      },
    });

    if (offers && offers.length > 0) {
      for (const offer of offers) {
        const { offerRules, ...offerData } = offer;
        
        const offerCreateData = {
          ...offerData,
          categoryId: newCategory.id,
          startDate: new Date(offerData.startDate),
          endDate: new Date(offerData.endDate)
        };

        if (Array.isArray(offerRules) && offerRules.length > 0) {
          const processedRules = [];
          
          for (const rule of offerRules) {
            const priceBelow = parseFloat(rule.price_below ?? rule.priceBelow);
            const priceAbove = parseFloat(rule.price_above ?? rule.priceAbove);
            const minDiscount = parseInt(rule.min_discount ?? rule.minDiscount);
            const maxDiscount = parseInt(rule.max_discount ?? rule.maxDiscount);
            const ageGroupStart = parseInt(rule.ageGroupStart);
            const ageGroupEnd = parseInt(rule.ageGroupEnd);

            const ruleData = {
              priceBelow: isNaN(priceBelow) ? undefined : priceBelow,
              priceAbove: isNaN(priceAbove) ? undefined : priceAbove,
              minDiscount: isNaN(minDiscount) ? undefined : minDiscount,
              maxDiscount: isNaN(maxDiscount) ? undefined : maxDiscount,
              ageGroupStart: isNaN(ageGroupStart) ? undefined : ageGroupStart,
              ageGroupEnd: isNaN(ageGroupEnd) ? undefined : ageGroupEnd,
              tags: Array.isArray(rule.tags) ? rule.tags : [],
              subcategoryId: undefined,
            };

            if (rule.subcategoryId) {
              const payloadSubcat = subcategories.find(sub => sub.id === rule.subcategoryId);
              if (payloadSubcat) {
                const intendedName = payloadSubcat.name;
                const newSubcat = newCategory.subcategories.find(s => s.name === intendedName);
                if (newSubcat) {
                  ruleData.subcategoryId = newSubcat.id;
                  console.log(`Mapped rule subcategoryId ${rule.subcategoryId} ("${intendedName}") to new DB ID ${newSubcat.id}`);
                } else {
                  console.warn(`New subcategory "${intendedName}" not found for rule in offer "${offer.title}" - skipping rule`);
                  continue;
                }
              } else {
                console.warn(`Payload subcategory with ID ${rule.subcategoryId} not found for rule in offer "${offer.title}" - skipping rule`);
                continue;
              }
            } else {
              const subName = rule.subCategoriesName || rule.subcategoryName;
              if (subName) {
                const newSubcat = newCategory.subcategories.find(s => s.name === subName);
                if (newSubcat) {
                  ruleData.subcategoryId = newSubcat.id;
                } else {
                  console.warn(`Subcategory "${subName}" not found for rule in offer "${offer.title}" - skipping rule`);
                  continue;
                }
              } else {
                console.log(`No subcategory specified for rule in offer "${offer.title}" - creating category-wide rule`);
              }
            }

            if (ruleData.subcategoryId || ruleData.priceBelow !== undefined || ruleData.priceAbove !== undefined) {
              processedRules.push(ruleData);
            }
          }

          if (processedRules.length > 0) {
            offerCreateData.offerRules = {
              create: processedRules
            };
          } else {
            console.warn(`No valid rules processed for offer "${offer.title}" - creating without rules`);
          }
        }

        await prisma.offer.create({
          data: offerCreateData,
          include: { offerRules: true }
        });
      }
    }

    const completeCategory = await prisma.category.findUnique({
      where: { id: newCategory.id },
      include: { 
        subcategories: true, 
        offers: { include: { offerRules: true } } 
      }
    });

    createdCategories.push(completeCategory);
  }
  
  return createdCategories;
};