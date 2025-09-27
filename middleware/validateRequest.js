import { validationResult } from 'express-validator';

// Custom validator for Decimal prices (strings representing decimal numbers)
export const isValidDecimal = (value) => {
  if (typeof value !== 'string') return false;
  return /^\d+(\.\d+)?$/.test(value);
};

// Custom validator for SKU format
export const isValidSKU = (value) => {
  if (typeof value !== 'string') return false;
  const skuRegex = /^[A-Z]{3}-[A-Z]{3}-\d{6}$/;
  return skuRegex.test(value) && value.length <= 50;
};

// Custom validator for SEO slug
export const isValidSlug = (value) => {
  if (typeof value !== 'string') return false;
  const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  return slugRegex.test(value) && value.length <= 255;
};

// Custom validator for product dimensions
export const isValidDimensions = (value) => {
  if (!value || typeof value !== 'object') return false;
  const { length, width, height } = value;
  if (typeof length !== 'number' || typeof width !== 'number' || typeof height !== 'number') {
    return false;
  }
  return length > 0 && width > 0 && height > 0 && length <= 500 && width <= 500 && height <= 500;
};

// Custom validator for weight (positive decimal)
export const isValidWeight = (value) => {
  if (value === null || value === undefined) return true; // Optional
  if (typeof value !== 'number' && typeof value !== 'string') return false;
  const num = parseFloat(value);
  return !isNaN(num) && num > 0 && num <= 99999.999;
};

const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array().map(e => ({
        field: e.param,
        message: e.msg
      }))
    });
  }
  next();
};

export default validateRequest;
