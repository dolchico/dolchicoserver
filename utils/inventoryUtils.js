// utils/inventoryUtils.js - SKU and inventory management utilities

/**
 * Generate a unique SKU for a product
 * @param {string} categoryName - Category name
 * @param {string} subcategoryName - Subcategory name
 * @param {number} productId - Product ID
 * @returns {string} Generated SKU
 */
export const generateSKU = (categoryName, subcategoryName, productId) => {
  if (!categoryName || !subcategoryName || !productId) {
    return `PRD-${productId}`;
  }

  // Take first 3 chars of category and subcategory
  const catCode = categoryName.substring(0, 3).toUpperCase();
  const subCatCode = subcategoryName.substring(0, 3).toUpperCase();

  return `${catCode}-${subCatCode}-${String(productId).padStart(6, '0')}`;
};

/**
 * Validate SKU format
 * @param {string} sku - SKU to validate
 * @returns {boolean} True if valid
 */
export const isValidSKU = (sku) => {
  if (!sku || typeof sku !== 'string') return false;
  const skuRegex = /^[A-Z]{3}-[A-Z]{3}-\d{6}$/;
  return skuRegex.test(sku) && sku.length <= 50;
};

/**
 * Calculate shipping weight including packaging
 * @param {number} productWeight - Product weight in kg
 * @param {number} packagingWeight - Packaging weight in kg (default 0.1)
 * @returns {number} Total shipping weight
 */
export const calculateShippingWeight = (productWeight, packagingWeight = 0.1) => {
  if (!productWeight || productWeight <= 0) return packagingWeight;
  return parseFloat(productWeight) + packagingWeight;
};

/**
 * Validate product dimensions
 * @param {object} dimensions - {length, width, height}
 * @returns {boolean} True if valid
 */
export const validateDimensions = (dimensions) => {
  if (!dimensions || typeof dimensions !== 'object') return false;

  const { length, width, height } = dimensions;
  if (typeof length !== 'number' || typeof width !== 'number' || typeof height !== 'number') {
    return false;
  }

  return length > 0 && width > 0 && height > 0 && length <= 500 && width <= 500 && height <= 500;
};

/**
 * Calculate volumetric weight for shipping
 * @param {object} dimensions - {length, width, height} in cm
 * @param {number} divisor - Shipping divisor (default 5000)
 * @returns {number} Volumetric weight in kg
 */
export const calculateVolumetricWeight = (dimensions, divisor = 5000) => {
  if (!validateDimensions(dimensions)) return 0;

  const { length, width, height } = dimensions;
  const volume = length * width * height; // in cm³
  return volume / divisor; // Convert to kg
};
