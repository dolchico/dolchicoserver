import { body } from 'express-validator';
import validateRequest from '../middleware/validateRequest.js';

// Validation for registration
export const validateRegister = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required'),

  body('email')
    .isEmail()
    .withMessage('Valid email is required'),

  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),

  validateRequest
];

// Validation for login
export const validateLogin = [
  body('email')
    .isEmail()
    .withMessage('Valid email is required'),

  body('password')
    .notEmpty()
    .withMessage('Password is required'),

  validateRequest
];
