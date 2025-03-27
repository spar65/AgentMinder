import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import { createLogger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import apiRoutes from './routes';
import swaggerSpec from './config/swagger';
import { Server } from 'http';
import { connectToDatabase, disconnectFromDatabase } from './config/database';
import { responseTimeMiddleware } from './middleware/responseTimeMiddleware';
import { loggingMiddleware } from './middleware/loggingMiddleware';
import { loggerService } from './utils/logger';

// Load environment variables
dotenv.config();

// Initialize logger
const logger = createLogger();

// Initialize Express app
const app = express();
const port = process.env.PORT || 3000;
let server: Server | null = null;

// Make the server globally accessible for tests
declare global {
  var server: Server | null;
}

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Add custom middleware
app.use(responseTimeMiddleware);
app.use(loggingMiddleware);

// Add basic security headers
app.use((req, res, next) => {
  // Remove sensitive headers
  res.removeHeader('X-Powered-By');
  
  // Set security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  next();
});

// API Documentation
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/api/docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// Routes
app.use('/api', apiRoutes);

// Home route
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to Agent Minder API',
    version: '1.0.0',
    documentation: '/api/docs'
  });
});

// Error handling middleware
app.use(errorHandler);

const startServer = async (): Promise<Server> => {
  try {
    // Connect to MongoDB using the centralized database module
    await connectToDatabase();
    loggerService.info('Connected to MongoDB');
    
    // Create server
    server = app.listen(port, () => {
      loggerService.info(`Server running on port ${port}`);
      loggerService.info(`API available at http://localhost:${port}/api`);
      loggerService.info(`API Documentation available at http://localhost:${port}/api/docs`);
    });
    
    // Store server globally for tests to access
    global.server = server;
    
    return server;
  } catch (error) {
    loggerService.error('Failed to start server', { error });
    process.exit(1);
  }
};

const stopServer = async (): Promise<void> => {
  if (server) {
    await new Promise<void>((resolve) => {
      server!.close(() => {
        loggerService.info('Server stopped');
        resolve();
      });
    });
    server = null;
    global.server = null;
  }
  
  // Close MongoDB connection using the centralized database module
  await disconnectFromDatabase();
  await mongoose.disconnect();
  loggerService.info('Disconnected from MongoDB');
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (error) => {
  loggerService.error('Unhandled Rejection', { error });
  process.exit(1);
});

// Handle SIGTERM signal
process.on('SIGTERM', async () => {
  loggerService.info('SIGTERM received. Starting graceful shutdown...');
  await stopServer();
  process.exit(0);
});

// Handle SIGINT signal (Ctrl+C)
process.on('SIGINT', async () => {
  loggerService.info('SIGINT received. Starting graceful shutdown...');
  await stopServer();
  process.exit(0);
});

// Start the server if not being imported in tests
if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export { app, startServer, stopServer };
export default app; 