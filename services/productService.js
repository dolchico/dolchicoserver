// services/productService.js
import prisma from '../lib/prisma.js';

export const createProduct = async (data) => {
  return await prisma.product.create({ data });
};

export const getAllProducts = async () => {
  return await prisma.product.findMany();
};

export const deleteProductById = async (id) => {
  return await prisma.product.delete({ where: { id: Number(id) } });
};

export const getProductById = async (id) => {
  return await prisma.product.findUnique({
    where: { id: Number(id) }, // This line correctly attempts to convert the id to a number
  });
};

// ✅ Add Search Products Service - NEW FUNCTION
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
    
    // Build where conditions for search
    const whereConditions = {
      AND: [
        // Main search across multiple fields
        {
          OR: [
            {
              name: {
                contains: query,
                mode: 'insensitive'
              }
            },
            {
              description: {
                contains: query,
                mode: 'insensitive'
              }
            },
            {
              category: {
                contains: query,
                mode: 'insensitive'
              }
            },
            {
              subCategory: {
                contains: query,
                mode: 'insensitive'
              }
            }
          ]
        },
        // Only show products with stock
        { stock: { gt: 0 } }
      ]
    };

    // Add category filter if provided
    if (filters.category) {
      whereConditions.AND.push({ 
        category: { 
          equals: filters.category, 
          mode: 'insensitive' 
        } 
      });
    }
    
    // Add subcategory filter if provided
    if (filters.subCategory) {
      whereConditions.AND.push({ 
        subCategory: { 
          equals: filters.subCategory, 
          mode: 'insensitive' 
        } 
      });
    }
    
    // Add price range filters
    if (filters.minPrice !== undefined) {
      whereConditions.AND.push({ 
        price: { gte: parseFloat(filters.minPrice) } 
      });
    }
    
    if (filters.maxPrice !== undefined) {
      whereConditions.AND.push({ 
        price: { lte: parseFloat(filters.maxPrice) } 
      });
    }

    // Build order by criteria
    const getOrderBy = (sortBy) => {
      switch (sortBy) {
        case 'price_low':
          return [{ price: 'asc' }];
        case 'price_high':
          return [{ price: 'desc' }];
        case 'newest':
          return [{ date: 'desc' }];
        case 'oldest':
          return [{ date: 'asc' }];
        case 'name':
          return [{ name: 'asc' }];
        case 'relevance':
        default:
          // For relevance, prioritize name matches, then newest
          return [{ name: 'asc' }, { date: 'desc' }];
      }
    };

    const orderBy = getOrderBy(sortBy);

    // Execute search query and count in parallel
    const [products, totalCount] = await Promise.all([
      prisma.product.findMany({
        where: whereConditions,
        orderBy,
        skip,
        take,
        select: {
          id: true,
          name: true,
          description: true,
          price: true,
          image: true,
          category: true,
          subCategory: true,
          sizes: true,
          stock: true,
          bestseller: true,
          date: true
        }
      }),
      prisma.product.count({
        where: whereConditions
      })
    ]);

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / take);
    const hasNextPage = parseInt(page) < totalPages;
    const hasPrevPage = parseInt(page) > 1;

    // Get search suggestions if no results found
    let suggestions = [];
    if (products.length === 0) {
      suggestions = await getSearchSuggestions(query);
    }

    // Get category statistics for the search
    const categoryStats = await prisma.product.groupBy({
      by: ['category'],
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } }
        ],
        stock: { gt: 0 }
      },
      _count: {
        category: true
      },
      orderBy: {
        _count: {
          category: 'desc'
        }
      },
      take: 5
    });

    return {
      products,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalCount,
        hasNextPage,
        hasPrevPage,
        limit: take
      },
      metadata: {
        query,
        resultCount: products.length,
        suggestions,
        categoryStats: categoryStats.map(stat => ({
          name: stat.category,
          count: stat._count.category
        }))
      }
    };

  } catch (error) {
    console.error('Search service error:', error);
    throw new Error(`Search operation failed: ${error.message}`);
  }
};

// Helper function for search suggestions
const getSearchSuggestions = async (query) => {
  try {
    // Get similar product names for suggestions
    const suggestions = await prisma.product.findMany({
      where: {
        OR: [
          {
            name: {
              contains: query.substring(0, Math.max(2, query.length - 2)),
              mode: 'insensitive'
            }
          },
          {
            category: {
              contains: query.substring(0, Math.max(2, query.length - 1)),
              mode: 'insensitive'
            }
          }
        ],
        stock: { gt: 0 }
      },
      select: { 
        name: true,
        category: true 
      },
      take: 5
    });

    // Extract unique suggestions
    const uniqueSuggestions = new Set();
    suggestions.forEach(item => {
      uniqueSuggestions.add(item.name);
      uniqueSuggestions.add(item.category);
    });

    return Array.from(uniqueSuggestions).slice(0, 5);
    
  } catch (error) {
    console.error('Error getting suggestions:', error);
    return [];
  }
};
