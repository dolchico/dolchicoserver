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

    const { offerRules, ...rest } = offerData;

    const data = { ...rest, categoryId: parseInt(categoryId, 10) };

    if (Array.isArray(offerRules) && offerRules.length) {
      // Prepare nested create for offerRules, resolving subcategoryName to id when provided
      const nestedRules = [];
      for (const r of offerRules) {
        const rule = { ...r };
        if (r.subCategoriesName || r.subcategoryName) {
          const name = r.subCategoriesName || r.subcategoryName;
          const sub = await findSubcategoryByName(categoryId, name);
          if (sub) rule.subcategoryId = sub.id;
          delete rule.subCategoriesName;
          delete rule.subcategoryName;
        }
        // Prisma expects Decimal for numeric Decimal fields; keep numbers as-is and let Prisma coerce if needed
        nestedRules.push({
          priceBelow: rule.price_below ?? rule.priceBelow ?? undefined,
          priceAbove: rule.price_above ?? rule.priceAbove ?? undefined,
          minDiscount: rule.min_discount ?? rule.minDiscount ?? undefined,
          maxDiscount: rule.max_discount ?? rule.maxDiscount ?? undefined,
          ageGroupStart: rule.ageGroupStart ?? undefined,
          ageGroupEnd: rule.ageGroupEnd ?? undefined,
          tags: rule.tags ?? [],
          subcategoryId: rule.subcategoryId ?? undefined,
        });
      }

      data.offerRules = { create: nestedRules };
    }

    return prisma.offer.create({ data, include: { offerRules: true } });
};

export const updateOffer = async (id, offerData) => {
    if(offerData.startDate) offerData.startDate = new Date(offerData.startDate);
    if(offerData.endDate) offerData.endDate = new Date(offerData.endDate);
    const { offerRules, ...rest } = offerData;
    const data = { ...rest };

    if (Array.isArray(offerRules)) {
      // Better approach: upsert/update/create/delete to sync rules.
      // 1) fetch offer to get categoryId for subcategory name resolution
      const existingOffer = await prisma.offer.findUnique({ where: { id: parseInt(id, 10) }, select: { id: true, categoryId: true } });
      if (!existingOffer) throw new Error('Offer not found');

      const existingRules = await prisma.offerRule.findMany({ where: { offerId: existingOffer.id } });
      const existingIds = new Set(existingRules.map(r => r.id));

      const txOps = [];
      const incomingIds = new Set();

      for (const r of offerRules) {
        // resolve subcategory name -> id when provided
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
          // create new rule and associate with offer
          txOps.push(prisma.offerRule.create({ data: { ...ruleData, offerId: existingOffer.id } }));
        }
      }

      // delete rules that exist in DB but were not included in the incoming payload
      for (const er of existingRules) {
        if (!incomingIds.has(er.id)) {
          txOps.push(prisma.offerRule.delete({ where: { id: er.id } }));
        }
      }

      if (txOps.length) {
        await prisma.$transaction(txOps);
      }
    }

    // Update the offer fields (rules have been synced separately)
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
    
    // First, create the category with subcategories only (ignores payload IDs)
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

    // Now create offers separately with their rules
    if (offers && offers.length > 0) {
      for (const offer of offers) {
        const { offerRules, ...offerData } = offer;
        
        const offerCreateData = {
          ...offerData,
          categoryId: newCategory.id,
          startDate: new Date(offerData.startDate),
          endDate: new Date(offerData.endDate)
        };

        // Handle offerRules if present
        if (Array.isArray(offerRules) && offerRules.length > 0) {
          const processedRules = [];
          
          for (const rule of offerRules) {
            // Parse numerics if strings (e.g., from JSON)
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
              subcategoryId: undefined,  // Will resolve below
            };

            // NEW: Map payload subcategoryId to new DB ID via name lookup
            if (rule.subcategoryId) {
              // Find matching subcategory in payload by ID to get its name
              const payloadSubcat = subcategories.find(sub => sub.id === rule.subcategoryId);
              if (payloadSubcat) {
                const intendedName = payloadSubcat.name;
                // Lookup by name in newly created subcategories
                const newSubcat = newCategory.subcategories.find(s => s.name === intendedName);
                if (newSubcat) {
                  ruleData.subcategoryId = newSubcat.id;
                  console.log(`Mapped rule subcategoryId ${rule.subcategoryId} ("${intendedName}") to new DB ID ${newSubcat.id}`);
                } else {
                  console.warn(`New subcategory "${intendedName}" not found for rule in offer "${offer.title}" - skipping rule`);
                  continue;  // Skip this rule
                }
              } else {
                console.warn(`Payload subcategory with ID ${rule.subcategoryId} not found for rule in offer "${offer.title}" - skipping rule`);
                continue;  // Skip this rule
              }
            } else {
              // Optional fallback: If no ID but has name (future-proof)
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
                // subcategoryId remains undefined (OK for schema)
              }
            }

            // Only add if basic filters are present (or subcategory for targeted rule)
            if (ruleData.subcategoryId || ruleData.priceBelow !== undefined || ruleData.priceAbove !== undefined) {
              processedRules.push(ruleData);
            }
          }

          // Add nested create for offerRules
          if (processedRules.length > 0) {
            offerCreateData.offerRules = {
              create: processedRules
            };
          } else {
            console.warn(`No valid rules processed for offer "${offer.title}" - creating without rules`);
          }
        }

        // Create the offer with its rules
        await prisma.offer.create({
          data: offerCreateData,
          include: { offerRules: true }
        });
      }
    }

    // Fetch the complete category with all relations
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