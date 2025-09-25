import { validationResult } from 'express-validator';

// Custom validator for Decimal prices (strings representing decimal numbers)
export const isValidDecimal = (value) => {
  if (typeof value !== 'string') return false;
  return /^\d+(\.\d+)?$/.test(value);
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
