import winston from 'winston';

/**
 * Creates and configures a Winston logger instance.
 * @returns {winston.Logger} Configured logger instance
 */
export const createLogger = (): winston.Logger => {
  const logLevel = process.env.LOG_LEVEL || 'info';
  
  const logger = winston.createLogger({
    level: logLevel,
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json()
    ),
    defaultMeta: { service: 'agent-minder' },
    transports: [
      // Write to all logs with level 'info' and below to 'combined.log'
      new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
      new winston.transports.File({ filename: 'logs/combined.log' }),
    ],
  });

  // If we're not in production, also log to the console
  if (process.env.NODE_ENV !== 'production') {
    logger.add(
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        ),
      })
    );
  }

  return logger;
}; 