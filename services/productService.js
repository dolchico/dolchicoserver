// services/productService.js
import prisma from '../lib/prisma.js';
import { priceUtils, toPrismaDecimal } from '../utils/priceUtils.js';
import { generateProductSlug } from '../utils/seoUtils.js';
import { generateSKU } from '../utils/inventoryUtils.js';

/**
 * Creates a new product with category and subcategory relations.
 * @param {Object} data - Product data including name, subcategoryId, etc.
 * @param {number} [data.categoryId] - Optional category ID (overridden by subcategory's categoryId)
 * @param {number} data.subcategoryId - Required subcategory ID
 * @returns {Promise<Object>} The created product with updated SKU and seoSlug
 * @throws {Error} If input is invalid or database operations fail
 */
export const createProduct = async (data) => {
  try {
    // Validate input
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid product data');
    }
    const { categoryId: providedCategoryId, subcategoryId, name, sku, seoSlug, ...productData } = data;

    // Validate subcategoryId
    const subcategoryIdNum = Number(subcategoryId);
    if (isNaN(subcategoryIdNum) || subcategoryIdNum <= 0 || !Number.isInteger(subcategoryIdNum)) {
      throw new Error('Invalid subcategoryId');
    }

    // Validate optional categoryId
    if (typeof providedCategoryId !== 'undefined') {
      const categoryIdNum = Number(providedCategoryId);
      if (isNaN(categoryIdNum) || categoryIdNum <= 0 || !Number.isInteger(categoryIdNum)) {
        throw new Error('Invalid categoryId');
      }
    }

    // Validate required fields
    if (!name || typeof name !== 'string') {
      throw new Error('Product name is required');
    }

    // Check database connection
    if (!prisma) {
      throw new Error('Database connection not available');
    }

    // Resolve the subcategory
    const sub = await prisma.subcategory.findUnique({
      where: { id: subcategoryIdNum },
      select: { id: true, categoryId: true, name: true, category: { select: { name: true } } },
    });
    if (!sub) {
      throw new Error('Invalid subcategoryId provided');
    }

    const derivedCategoryId = sub.categoryId;
    if (typeof providedCategoryId !== 'undefined' && Number(providedCategoryId) !== derivedCategoryId) {
      console.warn(
        `createProduct: provided categoryId=${providedCategoryId} does not match subcategory(${subcategoryId}).categoryId=${derivedCategoryId}. Overriding with derived value.`
      );
    }

    // Prepare product data
    const enhancedProductData = { ...productData, name };
    if (!enhancedProductData.sku) {
      enhancedProductData.sku = generateSKU(sub.category.name, sub.name, Date.now());
    }
    if (!enhancedProductData.seoSlug) {
      enhancedProductData.seoSlug = generateProductSlug(enhancedProductData.name, Date.now());
    }

    // Create the product
    const product = await prisma.product.create({
      data: {
        ...enhancedProductData,
        category: { connect: { id: derivedCategoryId } },
        subcategory: { connect: { id: subcategoryIdNum } },
      },
    });

    // Update SKU and seoSlug with product ID
    const finalProduct = await prisma.product.update({
      where: { id: product.id },
      data: {
        sku: sku || generateSKU(sub.category.name, sub.name, product.id),
        seoSlug: seoSlug || generateProductSlug(enhancedProductData.name, product.id),
      },
    });

    return finalProduct;
  } catch (error) {
    console.error('Error creating product:', error);
    throw new Error(`Failed to create product: ${error.message}`);
  }
};

/**
 * Retrieves products with filtering, pagination, and their category and subcategory.
 * @param {Object} params - Query parameters
 * @param {number} [params.page=1] - Page number
 * @param {number} [params.limit=10] - Items per page
 * @param {string} [params.search] - Search term
 * @param {number} [params.categoryId] - Category ID filter
 * @param {number} [params.subcategoryId] - Subcategory ID filter
 * @param {string} [params.grouping] - Grouping filter
 * @returns {Promise<Object>} Products with pagination info
 * @throws {Error} If database query fails
 */
export const getProducts = async (params = {}) => {
  try {
    // Check database connection
    if (!prisma) {
      throw new Error('Database connection not available');
    }

    const {
      page = 1,
      limit = 10,
      search = '',
      categoryId,
      subcategoryId,
      grouping,
    } = params;

    const skip = (page - 1) * limit;
    const take = +limit;

    let where = {
      isActive: true,
      stock: { gt: 0 }, // Optional: only in-stock products
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { brand: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (categoryId) {
      where.categoryId = +categoryId;
    }

    if (subcategoryId) {
      where.subcategoryId = +subcategoryId;
    }

    if (grouping) {
      where.subcategory = {
        grouping: { equals: grouping, mode: 'insensitive' },
      };
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take,
        include: {
          category: true,
          subcategory: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.product.count({ where }),
    ]);

    const totalPages = Math.ceil(total / take);

    return {
      products,
      total,
      page,
      limit: take,
      totalPages,
    };
  } catch (error) {
    console.error('Error fetching products:', error);
    throw new Error(`Failed to fetch products: ${error.message}`);
  }
};

/**
 * Deletes a product by its ID.
 * @param {number} id - The ID of the product to delete
 * @returns {Promise<Object>} The deleted product
 * @throws {Error} If id is invalid or product not found
 */
export const deleteProductById = async (id) => {
  try {
    // Validate id
    const idNum = Number(id);
    if (isNaN(idNum) || idNum <= 0 || !Number.isInteger(idNum)) {
      throw new Error('Invalid product ID');
    }

    // Check database connection
    if (!prisma) {
      throw new Error('Database connection not available');
    }

    return await prisma.product.delete({ where: { id: idNum } });
  } catch (error) {
    console.error('Error deleting product:', error);
    throw new Error(`Failed to delete product: ${error.message}`);
  }
};

/**
 * Retrieves a product by its ID with category and subcategory.
 * @param {number} id - The ID of the product
 * @returns {Promise<Object|null>} The product with related category and subcategory, or null if not found
 * @throws {Error} If id is invalid or query fails
 */
export const getProductById = async (id) => {
  try {
    // Validate id
    const idNum = Number(id);
    if (isNaN(idNum) || idNum <= 0 || !Number.isInteger(idNum)) {
      throw new Error('Invalid product ID');
    }

    // Check database connection
    if (!prisma) {
      throw new Error('Database connection not available');
    }

    return await prisma.product.findUnique({
      where: { id: idNum },
      include: {
        category: true,
        subcategory: true,
      },
    });
  } catch (error) {
    console.error('Error fetching product by ID:', error);
    throw new Error(`Failed to fetch product: ${error.message}`);
  }
};

/**
 * Searches products based on query and filters.
 * @param {Object} searchParams - Search parameters
 * @param {string} [searchParams.query] - Search query
 * @param {number} [searchParams.page=1] - Page number
 * @param {number} [searchParams.limit=20] - Items per page
 * @param {Object} [searchParams.filters] - Filters (category, subCategory, tags, minPrice, maxPrice)
 * @param {string} [searchParams.sortBy=relevance] - Sort order
 * @returns {Promise<Object>} Search results with pagination and metadata
 * @throws {Error} If search parameters are invalid or query fails
 */
export const searchProductsService = async (searchParams) => {
  try {
    // Validate input
    if (!searchParams || typeof searchParams !== 'object') {
      throw new Error('Invalid search parameters');
    }
    const { query = '', page = 1, limit = 20, filters = {}, sortBy = 'relevance' } = searchParams;

    // Validate pagination
    const pageNum = Number(page);
    const limitNum = Number(limit);
    if (isNaN(pageNum) || pageNum <= 0 || !Number.isInteger(pageNum)) {
      throw new Error('Invalid page number');
    }
    if (isNaN(limitNum) || limitNum <= 0 || !Number.isInteger(limitNum)) {
      throw new Error('Invalid limit');
    }

    // Validate filters
    if (typeof filters !== 'object') {
      throw new Error('Invalid filters');
    }
    if (filters.category && typeof filters.category !== 'string') {
      throw new Error('Invalid category filter');
    }
    if (filters.subCategory && typeof filters.subCategory !== 'string') {
      throw new Error('Invalid subCategory filter');
    }
    if (filters.tags && (!Array.isArray(filters.tags) || filters.tags.some(tag => typeof tag !== 'string'))) {
      throw new Error('Invalid tags filter');
    }
    if (filters.minPrice !== undefined && (isNaN(filters.minPrice) || filters.minPrice < 0)) {
      throw new Error('Invalid minPrice');
    }
    if (filters.maxPrice !== undefined && (isNaN(filters.maxPrice) || filters.maxPrice < 0)) {
      throw new Error('Invalid maxPrice');
    }

    // Check database connection
    if (!prisma) {
      throw new Error('Database connection not available');
    }

    const skip = (pageNum - 1) * limitNum;
    const take = limitNum;

    const whereConditions = {
      AND: [
        {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } },
            { category: { name: { contains: query, mode: 'insensitive' } } },
            { subcategory: { name: { contains: query, mode: 'insensitive' } } },
            { tags: { hasSome: [query] } },
          ],
        },
        { stock: { gt: 0 } },
      ],
    };

    if (filters.category) {
      whereConditions.AND.push({
        category: { name: { equals: filters.category, mode: 'insensitive' } },
      });
    }

    if (filters.subCategory) {
      whereConditions.AND.push({
        subcategory: { name: { equals: filters.subCategory, mode: 'insensitive' } },
      });
    }

    if (filters.tags && Array.isArray(filters.tags) && filters.tags.length > 0) {
      whereConditions.AND.push({
        tags: { hasSome: filters.tags },
      });
    }

    if (filters.minPrice !== undefined) {
      whereConditions.AND.push({ price: { gte: toPrismaDecimal(filters.minPrice) } });
    }

    if (filters.maxPrice !== undefined) {
      whereConditions.AND.push({ price: { lte: toPrismaDecimal(filters.maxPrice) } });
    }

    const getOrderBy = (sortBy) => {
      switch (sortBy) {
        case 'price_low':
          return [{ price: 'asc' }];
        case 'price_high':
          return [{ price: 'desc' }];
        case 'newest':
          return [{ date: 'desc' }];
        default:
          return [{ name: 'asc' }, { date: 'desc' }];
      }
    };

    const orderBy = getOrderBy(sortBy);

    const [products, totalCount] = await Promise.all([
      prisma.product.findMany({
        where: whereConditions,
        orderBy,
        skip,
        take,
        include: {
          category: true,
          subcategory: true,
        },
      }),
      prisma.product.count({ where: whereConditions }),
    ]);

    const totalPages = Math.ceil(totalCount / take);

    const categoryIdStats = await prisma.product.groupBy({
      by: ['categoryId'],
      where: whereConditions,
      _count: { categoryId: true },
      orderBy: { _count: { categoryId: 'desc' } },
      take: 5,
    });

    const categoryIds = categoryIdStats.map((stat) => stat.categoryId);
    const categories = await prisma.category.findMany({
      where: { id: { in: categoryIds } },
      select: { id: true, name: true },
    });

    const categoryStats = categoryIdStats.map((stat) => {
      const category = categories.find((c) => c.id === stat.categoryId);
      return {
        name: category ? category.name : 'Unknown',
        count: stat._count.categoryId,
      };
    });

    return {
      products,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalCount,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1,
        limit: take,
      },
      metadata: {
        query,
        resultCount: products.length,
        suggestions: products.length === 0 ? await getSearchSuggestions(query) : [],
        categoryStats,
      },
    };
  } catch (error) {
    console.error('Search service error:', error);
    throw new Error(`Search operation failed: ${error.message}`);
  }
};

/**
 * Generates search suggestions based on query.
 * @param {string} query - Search query
 * @returns {Promise<Array>} Array of unique suggestion strings
 * @throws {Error} If query is invalid or database query fails
 */
const getSearchSuggestions = async (query) => {
  try {
    // Validate query
    if (typeof query !== 'string') {
      throw new Error('Invalid search query');
    }

    // Check database connection
    if (!prisma) {
      throw new Error('Database connection not available');
    }

    const suggestions = await prisma.product.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { category: { name: { contains: query, mode: 'insensitive' } } },
        ],
        stock: { gt: 0 },
      },
      include: {
        category: { select: { name: true } },
      },
      take: 5,
    });

    const uniqueSuggestions = new Set();
    suggestions.forEach((item) => {
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

/**
 * Retrieves stock levels for multiple products by their IDs.
 * @param {number[]} productIds - Array of product IDs
 * @returns {Promise<Object>} Map of product IDs to their stock levels
 * @throws {Error} If productIds is invalid or query fails
 */
export const getProductStock = async (productIds) => {
  try {
    // Validate productIds
    if (!Array.isArray(productIds) || productIds.length === 0) {
      throw new Error('productIds must be a non-empty array');
    }
    const validProductIds = productIds.map((id) => Number(id));
    const invalidIds = validProductIds.filter((id) => isNaN(id) || id <= 0 || !Number.isInteger(id));
    if (invalidIds.length > 0) {
      throw new Error(`Invalid product IDs: ${invalidIds.join(', ')}`);
    }

    // Check database connection
    if (!prisma) {
      throw new Error('Database connection not available');
    }

    const products = await prisma.product.findMany({
      where: { id: { in: validProductIds } },
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


// Add this to services/productService.js - No new service needed for update, as it's handled directly in controller with Prisma update
// The controller uses prisma.product.update directly, similar to how create uses the service.
// If you want a dedicated service function, add this:

// export const updateProduct = async (productId, data) => {
//   try {
//     // Validate id
//     const idNum = Number(productId);
//     if (isNaN(idNum) || idNum <= 0 || !Number.isInteger(idNum)) {
//       throw new Error('Invalid product ID');
//     }

//     // Check database connection
//     if (!prisma) {
//       throw new Error('Database connection not available');
//     }

//     // Resolve subcategory if provided
//     if (data.subcategoryId) {
//       const subIdNum = Number(data.subcategoryId);
//       const sub = await prisma.subcategory.findUnique({
//         where: { id: subIdNum },
//         select: { id: true, categoryId: true },
//       });
//       if (sub) {
//         data.categoryId = sub.categoryId;
//       } else {
//         throw new Error('Invalid subcategoryId provided');
//       }
//     }

//     return await prisma.product.update({
//       where: { id: idNum },
//       data,
//       include: {
//         category: true,
//         subcategory: true,
//       },
//     });
//   } catch (error) {
//     console.error('Error updating product:', error);
//     throw new Error(`Failed to update product: ${error.message}`);
//   }
// };
