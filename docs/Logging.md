# Logging System Documentation

## Overview

Agent Minder implements a comprehensive logging system using Winston for structured logging. The system captures application events, database operations, API requests, and errors to facilitate debugging, performance monitoring, and auditing.

## Log Levels

The following log levels are used in order of severity:

1. **ERROR**: Critical issues that require immediate attention
2. **WARN**: Potential issues that may require attention
3. **INFO**: Standard operational information
4. **DEBUG**: Detailed information useful for debugging
5. **VERBOSE**: Very detailed information about application flow

## Logger Architecture

### Core Components

1. **Logger Service** (`src/utils/logger.ts`):

   - Centralized logger configuration
   - Exports `loggerService` instance used throughout the application
   - Configures transports based on environment (console, file)

2. **Mongoose Logger** (`src/utils/mongooseLogger.ts`):

   - Plugin for Mongoose schemas
   - Automatically logs database operations
   - Used by all data models

3. **Request Logging Middleware** (`src/middleware/loggingMiddleware.ts`):

   - Logs incoming HTTP requests
   - Adds request ID for request tracing
   - Records request details and response status

4. **Response Time Middleware** (`src/middleware/responseTimeMiddleware.ts`):

   - Measures and logs API response times
   - Helps identify performance bottlenecks

5. **Error Handling Middleware** (`src/middleware/errorHandler.ts`):
   - Logs detailed information about errors
   - Formats appropriate error responses
   - Preserves stack traces in development

## Log Storage

Logs are stored in the `logs/` directory with the following files:

- `combined.log`: All log entries (all levels)
- `error.log`: Error-level logs only
- Date-stamped files for historical logs (e.g., `2023-07-15.log`)

For production environments, log rotation is configured to manage disk space:

- Maximum file size: 5MB
- Maximum files: 5 per level
- Compression of older logs

## Database Operation Logging

All models use the Mongoose logger plugin, which logs:

1. **Document Creation**:

   ```
   [timestamp] INFO: Document saved successfully {"collection":"agents","documentId":"60d21b4667d0d8992e610c85"}
   ```

2. **Document Updates**:

   ```
   [timestamp] INFO: Document updated successfully {"collection":"agents","documentId":"60d21b4667d0d8992e610c85","updatedFields":["status","lastActive"]}
   ```

3. **Find Operations**:

   ```
   [timestamp] INFO: Documents found {"collection":"transactions","filter":{"agent":"60d21b4667d0d8992e610c85"},"count":10}
   ```

4. **Delete Operations**:

   ```
   [timestamp] INFO: Document deleted successfully {"collection":"commissionCalculations","documentId":"60d21b4667d0d8992e610c99"}
   ```

5. **Database Errors**:
   ```
   [timestamp] ERROR: Error saving document {"collection":"agents","documentId":"60d21b4667d0d8992e610c85","errorMessage":"Validation failed: email: Email is already in use"}
   ```

## API Request Logging

Every API request generates log entries with the following information:

1. **Request Received**:

   ```
   [timestamp] INFO: API request received {"method":"POST","path":"/api/commissions/calculate","ip":"127.0.0.1","requestId":"7cefbe8e-6bef-4508-aba5-3705707cae2a"}
   ```

2. **Response Information**:

   ```
   [timestamp] INFO: API response sent {"method":"POST","path":"/api/commissions/calculate","statusCode":201,"responseTime":"125.34ms","requestId":"7cefbe8e-6bef-4508-aba5-3705707cae2a"}
   ```

3. **Request Errors**:
   ```
   [timestamp] ERROR: Request error {"path":"/api/commissions/calculate","method":"POST","error":"DatabaseError: Failed to calculate commission","requestId":"7cefbe8e-6bef-4508-aba5-3705707cae2a"}
   ```

## Error Logging

Errors are logged with rich contextual information:

```
[timestamp] ERROR: Failed to process payment {
  "error": {
    "name": "PaymentProcessError",
    "message": "Payment gateway timeout",
    "stack": "PaymentProcessError: Payment gateway timeout\n    at processPayment (/path/to/file.js:123:45)\n    ..."
  },
  "userId": "60d21b4667d0d8992e610c85",
  "amount": 1250.50,
  "paymentMethodId": "card_123456789",
  "requestId": "7cefbe8e-6bef-4508-aba5-3705707cae2a"
}
```

## Using the Logger

### Basic Usage

```typescript
import { loggerService } from '../utils/logger';

// Info level logging
loggerService.info('User logged in successfully', {
  userId: user.id,
  email: user.email,
});

// Warning level logging
loggerService.warn('Rate limit threshold approaching', {
  userId: user.id,
  currentRate: rate,
  limit: maxRate,
});

// Error level logging
loggerService.error('Failed to save commission calculation', {
  error, // Pass the full error object
  agentId,
  transactionId,
});
```

### Best Practices

1. **Always Include Context**:

   - Add relevant IDs (user, agent, transaction)
   - Include operational details (amounts, status values)
   - For errors, always include the error object

2. **Use Appropriate Log Levels**:

   - Don't overuse ERROR level (reserve for actual errors)
   - Use INFO for normal operational events
   - Use DEBUG for development-time information

3. **Security Considerations**:

   - Never log sensitive data (passwords, tokens, PII)
   - Sanitize user input before logging
   - Be careful with error messages that might reveal system details

4. **Performance Awareness**:
   - Be mindful of extensive DEBUG logging in production
   - For high-volume endpoints, limit detailed logging
   - Consider sampling for very high-traffic scenarios

## Log Analysis

### Local Development

For local development, logs are output to the console with color coding by log level, making it easy to identify errors and warnings.

### Production Environment

In production, consider setting up:

1. **Log Aggregation**: ELK Stack, Graylog, or similar tools
2. **Log Alerting**: Monitor for error spikes or critical issues
3. **Dashboard**: Visualize log data for operational insights

## Request Tracing

Each request is assigned a unique ID that is:

1. Added to all log entries related to the request
2. Returned in the response header (`X-Request-ID`)
3. Passed to downstream services if applicable

This allows tracing the complete lifecycle of a request through the system, even across multiple services.

## Adding Logging to New Components

When creating new components:

1. Import the logger service:

   ```typescript
   import { loggerService } from '../utils/logger';
   ```

2. For new models, add the mongoose logger plugin:

   ```typescript
   import { mongooseLogger } from '../utils/mongooseLogger';

   yourSchema.plugin(mongooseLogger);
   ```

3. Log important events with appropriate context.

## Future Enhancements

Planned enhancements to the logging system:

1. Structured log export for business intelligence
2. Real-time log streaming for monitoring dashboards
3. Integration with APM (Application Performance Monitoring) tools
4. Enhanced sampling strategies for high-volume endpoints
