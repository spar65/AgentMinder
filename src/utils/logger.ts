import winston from 'winston';
import { Request } from 'express';
import { v4 as uuidv4 } from 'uuid';

// Define log levels
export const logLevels = {
  error: 0,    // Error conditions
  warn: 1,     // Warning conditions
  info: 2,     // Informational messages
  http: 3,     // HTTP request-specific logs
  debug: 4,    // Debug messages
  trace: 5     // Trace-level messages
};

// Define log colors
const logColors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
  trace: 'gray'
};

// Custom format for development logs
const developmentFormat = winston.format.printf(({ level, message, timestamp, requestId, ...metadata }) => {
  let msg = `${timestamp} [${level}]`;
  
  // Add request ID if available
  if (requestId) {
    msg += ` [${requestId}]`;
  }
  
  // Add the log message
  msg += `: ${message}`;
  
  // Add metadata if present
  if (Object.keys(metadata).length > 0) {
    if (metadata.error && typeof metadata.error === 'object' && 'stack' in metadata.error) {
      msg += `\n${metadata.error.stack}`;
      delete metadata.error;
    }
    if (Object.keys(metadata).length > 0) {
      msg += `\n${JSON.stringify(metadata, null, 2)}`;
    }
  }
  
  return msg;
});

// Custom format for production logs (JSON)
const productionFormat = winston.format.printf(({ level, message, timestamp, requestId, ...metadata }) => {
  return JSON.stringify({
    timestamp,
    level,
    requestId,
    message,
    ...metadata
  });
});

/**
 * Creates and configures a Winston logger instance.
 * @returns {winston.Logger} Configured logger instance
 */
export const createLogger = (): winston.Logger => {
  const logLevel = process.env.LOG_LEVEL || 'info';
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Add colors to Winston
  winston.addColors(logColors);
  
  const logger = winston.createLogger({
    levels: logLevels,
    level: logLevel,
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      isProduction ? productionFormat : developmentFormat
    ),
    defaultMeta: { service: 'agent-minder' },
    transports: [
      // Always log errors separately
      new winston.transports.File({
        filename: 'logs/error.log',
        level: 'error',
        maxsize: 5242880, // 5MB
        maxFiles: 5,
      }),
      // Log all levels
      new winston.transports.File({
        filename: 'logs/combined.log',
        maxsize: 5242880, // 5MB
        maxFiles: 5,
      }),
    ],
  });

  // If we're not in production, log to the console with colors
  if (!isProduction) {
    logger.add(
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize({ all: true }),
          winston.format.timestamp(),
          developmentFormat
        ),
      })
    );
  }

  return logger;
};

// Create the logger instance
export const logger = createLogger();

// Request context type
interface RequestContext {
  requestId: string;
  userId?: string;
  path?: string;
  method?: string;
}

/**
 * Enriches log messages with request context
 */
export class LoggerService {
  private context?: RequestContext;

  constructor(private baseLogger: winston.Logger = logger) {}

  /**
   * Sets the request context for logging
   */
  setRequestContext(req: Request): void {
    this.context = {
      requestId: req.headers['x-request-id'] as string || uuidv4(),
      userId: (req as any).user?.id,
      path: req.path,
      method: req.method
    };
  }

  /**
   * Clears the request context
   */
  clearRequestContext(): void {
    this.context = undefined;
  }

  /**
   * Creates a log entry with the current context
   */
  private log(level: string, message: string, meta: Record<string, any> = {}): void {
    const logMeta = {
      ...this.context,
      ...meta
    };

    this.baseLogger.log(level, message, logMeta);
  }

  /**
   * Log error messages
   */
  error(message: string, meta: Record<string, any> = {}): void {
    if (meta.error && meta.error instanceof Error) {
      meta.errorStack = meta.error.stack;
      meta.errorMessage = meta.error.message;
    }
    this.log('error', message, meta);
  }

  /**
   * Log warning messages
   */
  warn(message: string, meta: Record<string, any> = {}): void {
    this.log('warn', message, meta);
  }

  /**
   * Log info messages
   */
  info(message: string, meta: Record<string, any> = {}): void {
    this.log('info', message, meta);
  }

  /**
   * Log HTTP-specific messages
   */
  http(message: string, meta: Record<string, any> = {}): void {
    this.log('http', message, meta);
  }

  /**
   * Log debug messages
   */
  debug(message: string, meta: Record<string, any> = {}): void {
    this.log('debug', message, meta);
  }

  /**
   * Log trace messages
   */
  trace(message: string, meta: Record<string, any> = {}): void {
    this.log('trace', message, meta);
  }
}

// Export a default logger service instance
export const loggerService = new LoggerService(logger); 