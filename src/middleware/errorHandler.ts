import { Request, Response, NextFunction } from 'express';
import { createLogger } from '../utils/logger';

const logger = createLogger();

/**
 * Custom error class for API errors
 */
export class ApiError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    
    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Global error handling middleware
 */
export const errorHandler = (
  err: Error | ApiError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void => {
  // Default status code and message
  let statusCode = 500;
  let message = 'Internal Server Error';
  let isOperational = false;

  // If this is our API error with status code
  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;
    isOperational = err.isOperational;
  }

  // Log error
  logger.error(`${statusCode} - ${message}`, {
    path: req.path,
    method: req.method,
    error: err,
    stack: err.stack
  });

  // Send error response
  res.status(statusCode).json({
    success: false,
    message,
    // Only include stack trace in development for non-operational errors
    ...(process.env.NODE_ENV === 'development' && !isOperational && { 
      stack: err.stack 
    })
  });
}; 