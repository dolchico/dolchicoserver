import prisma from '../lib/prisma.js';
import { priceUtils, toPrismaDecimal } from '../utils/priceUtils.js';
import { generateProductSlug } from '../utils/seoUtils.js';
import { generateSKU } from '../utils/inventoryUtils.js';

// CHANGED: createProduct now uses `connect` to link to existing categories/subcategories by their ID.
export const createProduct = async (data) => {
  // Require subcategoryId and derive the canonical categoryId from it.
  const { categoryId: providedCategoryId, subcategoryId, ...productData } = data;

  if (!subcategoryId) {
    throw new Error('subcategoryId is required to create a product.');
  }

  // Resolve the subcategory to get its categoryId and names for SKU generation.
  const sub = await prisma.subcategory.findUnique({
    where: { id: Number(subcategoryId) },
    select: { id: true, categoryId: true, name: true, category: { select: { name: true } } }
  });
  if (!sub) {
    throw new Error('Invalid subcategoryId provided');
  }

  const derivedCategoryId = sub.categoryId;
  if (typeof providedCategoryId !== 'undefined' && Number(providedCategoryId) !== derivedCategoryId) {
    console.warn(`createProduct: provided categoryId=${providedCategoryId} does not match subcategory(${subcategoryId}).categoryId=${derivedCategoryId}. Overriding with derived value.`);
  }

  // Prepare product data with auto-generated fields
  const enhancedProductData = { ...productData };

  // Auto-generate SKU if not provided
  if (!enhancedProductData.sku) {
    enhancedProductData.sku = generateSKU(sub.category.name, sub.name, Date.now()); // Use timestamp as temp ID
  }

  // Auto-generate seoSlug if not provided
  if (!enhancedProductData.seoSlug) {
    enhancedProductData.seoSlug = generateProductSlug(enhancedProductData.name, Date.now());
  }

  // Create the product
  const product = await prisma.product.create({
    data: {
      ...enhancedProductData,
      category: { connect: { id: Number(derivedCategoryId) } },
      subcategory: { connect: { id: Number(subcategoryId) } }
    }
  });

  // Update SKU and seoSlug with actual product ID for uniqueness
  const finalProduct = await prisma.product.update({
    where: { id: product.id },
    data: {
      sku: productData.sku || generateSKU(sub.category.name, sub.name, product.id),
      seoSlug: productData.seoSlug || generateProductSlug(enhancedProductData.name, product.id)
    }
  });

  return finalProduct;
};

// CHANGED: getAllProducts now uses `include` to fetch the related category and subcategory objects.
export const getAllProducts = async () => {
  return await prisma.product.findMany({
    include: {
      category: true,
      subcategory: true,
    }
  });
};

// NOTE: deleteProductById does not need changes as it only uses the product's own ID.
export const deleteProductById = async (id) => {
  return await prisma.product.delete({ where: { id: Number(id) } });
};

// CHANGED: getProductById now uses `include` to fetch the related category and subcategory objects.
export const getProductById = async (id) => {
  return await prisma.product.findUnique({
    where: { id: Number(id) },
    include: {
      category: true,
      subcategory: true,
    }
  });
};

// ✅ Add Search Products Service - COMPLETELY REVISED FOR RELATIONAL SCHEMA
export const searchProductsService = async (searchParams) => {
  try {
    const { 
      query, 
      page = 1, 
      limit = 20, 
      filters = {},
      sortBy = 'relevance' 
    } = searchParams;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);
    
    // CHANGED: whereConditions now uses relational filters (e.g., category: { name: ... })
    const whereConditions = {
      AND: [
        {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } },
            // Search on the *name* of the related category/subcategory
            { category: { name: { contains: query, mode: 'insensitive' } } },
            { subcategory: { name: { contains: query, mode: 'insensitive' } } },
            // Search in tags array
            { tags: { hasSome: [query] } }
          ]
        },
        { stock: { gt: 0 } }
      ]
    };

    // CHANGED: Category filter now targets the related category's name.
    if (filters.category) {
      whereConditions.AND.push({ 
        category: { name: { equals: filters.category, mode: 'insensitive' } }
      });
    }
    
    // CHANGED: Subcategory filter now targets the related subcategory's name.
    if (filters.subCategory) {
      whereConditions.AND.push({ 
        subcategory: { name: { equals: filters.subCategory, mode: 'insensitive' } }
      });
    }
    
    // Tag filter
    if (filters.tags && Array.isArray(filters.tags) && filters.tags.length > 0) {
      whereConditions.AND.push({
        tags: { hasSome: filters.tags }
      });
    }
    
    if (filters.minPrice !== undefined) {
      whereConditions.AND.push({ price: { gte: toPrismaDecimal(filters.minPrice) } });
    }
    
    if (filters.maxPrice !== undefined) {
      whereConditions.AND.push({ price: { lte: toPrismaDecimal(filters.maxPrice) } });
    }

    const getOrderBy = (sortBy) => {
      // NOTE: Sorting logic remains the same.
      switch (sortBy) {
        case 'price_low': return [{ price: 'asc' }];
        case 'price_high': return [{ price: 'desc' }];
        case 'newest': return [{ date: 'desc' }];
        default: return [{ name: 'asc' }, { date: 'desc' }];
      }
    };

    const orderBy = getOrderBy(sortBy);

    const [products, totalCount] = await Promise.all([
      prisma.product.findMany({
        where: whereConditions,
        orderBy,
        skip,
        take,
        // CHANGED: Use `include` instead of `select` to get full related objects, which is more consistent.
        include: {
          category: true,
          subcategory: true,
        }
      }),
      prisma.product.count({ where: whereConditions })
    ]);

    const totalPages = Math.ceil(totalCount / take);

    // CHANGED: `categoryStats` logic is completely rewritten because `groupBy` cannot be used on a relation directly.
    // Step 1: Group by the foreign key `categoryId`.
    const categoryIdStats = await prisma.product.groupBy({
      by: ['categoryId'],
      where: whereConditions, // Use the same filters from the main search
      _count: { categoryId: true },
      orderBy: { _count: { categoryId: 'desc' } },
      take: 5
    });

    // Step 2: Fetch the category names for the IDs we found.
    const categoryIds = categoryIdStats.map(stat => stat.categoryId);
    const categories = await prisma.category.findMany({
      where: { id: { in: categoryIds } },
      select: { id: true, name: true }
    });
    
    // Step 3: Combine the names and counts.
    const categoryStats = categoryIdStats.map(stat => {
        const category = categories.find(c => c.id === stat.categoryId);
        return {
            name: category ? category.name : 'Unknown',
            count: stat._count.categoryId
        };
    });

    return {
      products,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalCount,
        hasNextPage: parseInt(page) < totalPages,
        hasPrevPage: parseInt(page) > 1,
        limit: take
      },
      metadata: {
        query,
        resultCount: products.length,
        suggestions: products.length === 0 ? await getSearchSuggestions(query) : [],
        categoryStats
      }
    };

  } catch (error) {
    console.error('Search service error:', error);
    throw new Error(`Search operation failed: ${error.message}`);
  }
};

// Helper function for search suggestions, updated for relational queries.
const getSearchSuggestions = async (query) => {
  try {
    const suggestions = await prisma.product.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          // CHANGED: Search on the related category's name.
          { category: { name: { contains: query, mode: 'insensitive' } } }
        ],
        stock: { gt: 0 }
      },
      // CHANGED: Include the category name in the result.
      include: {
        category: { select: { name: true } }
      },
      take: 5
    });

    const uniqueSuggestions = new Set();
    suggestions.forEach(item => {
      uniqueSuggestions.add(item.name);
      if (item.category) {
        uniqueSuggestions.add(item.category.name);
      }
    });

    return Array.from(uniqueSuggestions).slice(0, 5);
    
  } catch (error) {
    console.error('Error getting suggestions:', error);
    return [];
  }
};


export const getProductStock = async (productIds) => {
  try {
    if (!Array.isArray(productIds) || productIds.length === 0) {
      throw new Error('productIds must be a non-empty array');
    }
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, stock: true },
    });
    const stockMap = products.reduce((map, product) => {
      map[product.id] = product.stock ?? 0;
      return map;
    }, {});
    console.log('Product stock fetched:', stockMap);
    return stockMap;
  } catch (error) {
    console.error('Error in getProductStock:', error);
    throw error;
  }
};