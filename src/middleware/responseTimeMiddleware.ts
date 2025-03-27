import { Request, Response, NextFunction } from 'express';

/**
 * Middleware that tracks response time
 */
export const responseTimeMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const start = process.hrtime();

  // Use 'finish' event to avoid setting headers after they've been sent
  res.on('finish', () => {
    const diff = process.hrtime(start);
    const time = diff[0] * 1e3 + diff[1] * 1e-6; // Convert to milliseconds
    // Log the time but don't attempt to set headers after response is finished
    console.log(`${req.method} ${req.path} - ${time.toFixed(2)}ms`);
  });

  next();
}; 