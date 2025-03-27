import { Request, Response, NextFunction } from 'express';
import { loggerService } from '../utils/logger';

/**
 * Middleware that injects request context into the logger
 */
export const loggingMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  // Set request context in logger
  loggerService.setRequestContext(req);

  // Log the incoming request
  loggerService.http('Incoming request', {
    method: req.method,
    path: req.path,
    query: req.query,
    headers: {
      ...req.headers,
      // Exclude sensitive headers
      authorization: req.headers.authorization ? '[REDACTED]' : undefined,
      cookie: req.headers.cookie ? '[REDACTED]' : undefined
    }
  });

  // Log response data when the response is finished
  res.on('finish', () => {
    loggerService.http('Request completed', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      statusMessage: res.statusMessage,
      responseTime: res.get('X-Response-Time')
    });

    // Clear request context
    loggerService.clearRequestContext();
  });

  next();
}; 