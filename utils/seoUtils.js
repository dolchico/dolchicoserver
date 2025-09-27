// utils/seoUtils.js - SEO utilities for product slugs and optimization

/**
 * Generate a URL-friendly slug from a product name
 * @param {string} name - Product name
 * @param {number} productId - Product ID for uniqueness
 * @returns {string} SEO-friendly slug
 */
export const generateProductSlug = (name, productId) => {
  if (!name) return `product-${productId}`;

  return name
    .toLowerCase()
    .trim()
    // Replace spaces and special chars with hyphens
    .replace(/[^a-z0-9\s-]/g, '') // Remove special chars except spaces and hyphens
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
    .substring(0, 100) // Limit length
    + (productId ? `-${productId}` : ''); // Append ID for uniqueness
};

/**
 * Validate SEO slug format
 * @param {string} slug - Slug to validate
 * @returns {boolean} True if valid
 */
export const isValidSlug = (slug) => {
  if (!slug || typeof slug !== 'string') return false;
  const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  return slugRegex.test(slug) && slug.length <= 255;
};

/**
 * Sanitize product name for SEO
 * @param {string} name - Product name
 * @returns {string} Sanitized name
 */
export const sanitizeProductName = (name) => {
  if (!name) return '';
  return name
    .replace(/[^\w\s-]/g, '') // Remove special chars
    .trim()
    .substring(0, 200); // Limit length
};
