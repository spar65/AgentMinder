/**
 * Base class for custom application errors
 */
export class CustomError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code: string = 'INTERNAL_SERVER_ERROR'
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error thrown when validation fails
 */
export class ValidationError extends CustomError {
  constructor(message: string) {
    super(message, 400, 'VALIDATION_ERROR');
  }
}

/**
 * Error thrown when a resource is not found
 */
export class NotFoundError extends CustomError {
  constructor(message: string) {
    super(message, 404, 'NOT_FOUND');
  }
}

/**
 * Error thrown when authentication fails
 */
export class AuthenticationError extends CustomError {
  constructor(message: string) {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

/**
 * Error thrown when authorization fails
 */
export class AuthorizationError extends CustomError {
  constructor(message: string) {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

/**
 * Error thrown when there's a conflict
 */
export class ConflictError extends CustomError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT_ERROR');
  }
}

/**
 * Error thrown when there's a database error
 */
export class DatabaseError extends CustomError {
  constructor(message: string) {
    super(message, 500, 'DATABASE_ERROR');
  }
}

/**
 * Error thrown when there's an external service error
 */
export class ExternalServiceError extends CustomError {
  constructor(message: string) {
    super(message, 502, 'EXTERNAL_SERVICE_ERROR');
  }
} 