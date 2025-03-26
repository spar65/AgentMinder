import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import { createLogger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import apiRoutes from './routes';
import swaggerSpec from './config/swagger';

// Load environment variables
dotenv.config();

// Initialize logger
const logger = createLogger();

// Initialize Express app
const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

// Connect to MongoDB
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/agent-minder';

const startServer = async (): Promise<void> => {
  try {
    await mongoose.connect(mongoUri);
    logger.info('Connected to MongoDB');
    
    app.listen(port, () => {
      logger.info(`Server running on port ${port}`);
      logger.info(`API available at http://localhost:${port}/api`);
      logger.info(`API Documentation available at http://localhost:${port}/api/docs`);
    });
  } catch (error) {
    logger.error('Failed to connect to MongoDB', { error });
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (error) => {
  logger.error('Unhandled Rejection', { error });
  process.exit(1);
});

// Start the server
startServer();

export default app; 