import { Request, Response, NextFunction } from 'express';

/**
 * Interface for validation schema handlers
 */
interface ValidationSchema {
  validate: (data: any, options?: any) => { error?: any; value: any };
}

/**
 * Validation error response
 */
export interface ValidationError {
  field: string;
  message: string;
}

/**
 * Middleware for validating request data against a schema
 * @param schema Validation schema
 * @param property Request property to validate (body, query, params)
 */
export const validateRequest = (
  schema: ValidationSchema,
  property: 'body' | 'query' | 'params' = 'body'
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errors: ValidationError[] = error.details.map((detail: any) => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors,
      });
    }

    // Replace request data with validated data
    req[property] = value;
    next();
  };
};

/**
 * Sanitize input to prevent XSS attacks
 * @param input Text input to sanitize
 * @returns Sanitized input
 */
export const sanitizeInput = (input: string): string => {
  if (!input) return input;
  
  // Remove HTML tags
  let sanitized = input.replace(/<[^>]*>/g, '');
  
  // Encode special characters
  sanitized = sanitized.replace(/[&<>"']/g, (m) => {
    return {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }[m]!;
  });
  
  return sanitized;
};

/**
 * Validate a MongoDB ObjectId
 * @param id String to validate as ObjectId
 * @returns Boolean indicating if string is a valid ObjectId
 */
export const isValidObjectId = (id: string): boolean => {
  return /^[0-9a-fA-F]{24}$/.test(id);
};

/**
 * Validate email format
 * @param email Email to validate
 * @returns Boolean indicating if email is valid
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[\w-]+(\.[\w-]+)*@([\w-]+\.)+[a-zA-Z]{2,7}$/;
  return emailRegex.test(email);
};

/**
 * Validate phone number format
 * @param phone Phone number to validate
 * @returns Boolean indicating if phone number is valid
 */
export const isValidPhone = (phone: string): boolean => {
  // Basic international phone format validation
  const phoneRegex = /^\+?[1-9]\d{9,14}$/;
  return phoneRegex.test(phone);
};

/**
 * Sanitize an object's string properties
 * @param obj Object to sanitize
 * @returns New object with sanitized string properties
 */
export const sanitizeObject = <T>(obj: T): T => {
  if (!obj || typeof obj !== 'object') return obj;
  
  const result = { ...obj } as any;
  
  for (const key in result) {
    if (typeof result[key] === 'string') {
      result[key] = sanitizeInput(result[key]);
    } else if (typeof result[key] === 'object' && result[key] !== null) {
      result[key] = sanitizeObject(result[key]);
    }
  }
  
  return result as T;
};

/**
 * Create a validation error message
 * @param field Field name
 * @param message Error message
 * @returns Validation error object
 */
export const createValidationError = (field: string, message: string): ValidationError => {
  return { field, message };
}; 