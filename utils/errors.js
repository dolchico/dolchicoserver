/**
 * This file defines custom error classes for the application.
 * Using custom errors instead of generic `new Error()` allows us to:
 *   1. Differentiate between different types of errors (e.g., user input vs. server fault).
 *   2. Attach specific HTTP status codes to each error type.
 *   3. Make the error handling logic in the controllers clean and predictable.
 */

// A base error class that all our application-specific errors will extend.
class AppError extends Error {
  constructor(message, statusCode) {
    // Call the parent `Error` class constructor with the error message.
    super(message);

    // Assign the HTTP status code to this error instance.
    this.statusCode = statusCode;

    // Set the error name to the class's name (e.g., 'ValidationError').
    this.name = this.constructor.name;

    // Capture a stack trace for debugging, excluding the constructor call from the trace.
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Represents an error caused by invalid user input.
 * This should always result in an HTTP 400 Bad Request response.
 * Example: A user provides a negative quantity for a cart item.
 */
export class ValidationError extends AppError {
  constructor(message = 'Invalid input data.') {
    // Pass the message and the 400 status code to the AppError constructor.
    super(message, 400);
  }
}

/**
 * Represents an error where a requested resource was not found in the database.
 * This should always result in an HTTP 404 Not Found response.
 * Example: A user tries to add a product with an ID that doesn't exist.
 */
export class NotFoundError extends AppError {
  constructor(message = 'Resource not found.') {
    // Pass the message and the 404 status code to the AppError constructor.
    super(message, 404);
  }
}
