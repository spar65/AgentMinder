import { Request, Response, NextFunction } from 'express';
import { loggerService } from '../utils/logger';
import { CustomError } from '../utils/errors';

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
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Log the error with full context
  loggerService.error('Request error', {
    error: err,
    path: req.path,
    method: req.method,
    query: req.query,
    body: req.body,
    params: req.params
  });

  // Handle known errors
  if (err instanceof CustomError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        message: err.message,
        code: err.code
      }
    });
    return;
  }

  // Handle unknown errors
  res.status(500).json({
    success: false,
    error: {
      message: process.env.NODE_ENV === 'production' 
        ? 'Internal server error'
        : err.message,
      code: 'INTERNAL_SERVER_ERROR'
    }
  });
}; 