// Base error for our application to extend from
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

// For user input validation errors (HTTP 400)
export class ValidationError extends AppError {
  constructor(message = 'Invalid input data.') {
    super(message, 400);
  }
}

// For resources not found (HTTP 404)
export class NotFoundError extends AppError {
  constructor(message = 'Resource not found.') {
    super(message, 404);
  }
}
