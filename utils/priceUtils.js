import Decimal from 'decimal.js';

// Utility functions for price calculations using Decimal for precision
export const priceUtils = {
  // Convert to Decimal
  toDecimal: (value) => new Decimal(value),

  // Add two prices
  add: (a, b) => new Decimal(a).add(new Decimal(b)),

  // Subtract
  subtract: (a, b) => new Decimal(a).sub(new Decimal(b)),

  // Multiply
  multiply: (a, b) => new Decimal(a).mul(new Decimal(b)),

  // Divide
  divide: (a, b) => new Decimal(a).div(new Decimal(b)),

  // Compare
  equals: (a, b) => new Decimal(a).equals(new Decimal(b)),

  // Greater than
  gt: (a, b) => new Decimal(a).gt(new Decimal(b)),

  // Less than
  lt: (a, b) => new Decimal(a).lt(new Decimal(b)),

  // Round to 2 decimal places
  round: (value) => new Decimal(value).toDecimalPlaces(2),

  // Convert to number (for DB storage as string or float)
  toNumber: (value) => new Decimal(value).toNumber(),

  // Convert to string for DB (Prisma Decimal)
  toString: (value) => new Decimal(value).toString(),

  // Format for display
  format: (value) => new Decimal(value).toFixed(2),
};

// Helper to convert Prisma Decimal to Decimal.js
export const fromPrismaDecimal = (prismaDecimal) => new Decimal(prismaDecimal.toString());

// Helper to convert to Prisma Decimal (string)
export const toPrismaDecimal = (value) => new Decimal(value).toString();
