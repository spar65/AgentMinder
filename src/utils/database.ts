import mongoose from 'mongoose';
import { loggerService } from './logger';

/**
 * Connect to MongoDB database
 */
export async function connectToDatabase(): Promise<void> {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI environment variable is not defined');
    }

    loggerService.info('Connecting to MongoDB...', { uri: mongoUri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@') });

    await mongoose.connect(mongoUri);

    // Add connection event listeners
    mongoose.connection.on('connected', () => {
      loggerService.info('MongoDB connection established');
    });

    mongoose.connection.on('error', (err) => {
      loggerService.error('MongoDB connection error', { error: err });
    });

    mongoose.connection.on('disconnected', () => {
      loggerService.warn('MongoDB connection disconnected');
    });

    // Handle process termination
    process.on('SIGINT', async () => {
      try {
        await mongoose.connection.close();
        loggerService.info('MongoDB connection closed through app termination');
        process.exit(0);
      } catch (err) {
        loggerService.error('Error closing MongoDB connection', { error: err });
        process.exit(1);
      }
    });

  } catch (error) {
    loggerService.error('Failed to connect to MongoDB', { error });
    throw error;
  }
}

/**
 * Disconnect from MongoDB database
 */
export async function disconnectFromDatabase(): Promise<void> {
  try {
    await mongoose.connection.close();
    loggerService.info('MongoDB connection closed');
  } catch (error) {
    loggerService.error('Error disconnecting from MongoDB', { error });
    throw error;
  }
} 