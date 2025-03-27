import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { createLogger } from '../utils/logger';

dotenv.config();

const logger = createLogger();

// Get MongoDB URI based on environment
const getMongoUri = (): string => {
  let uri = process.env.MONGODB_URI;
  
  if (!uri) {
    const defaultUri = process.env.NODE_ENV === 'test' 
      ? 'mongodb://testadmin:testpassword@localhost:27018/agent-minder-test?authSource=admin'
      : 'mongodb://admin:password@localhost:27017/agent-minder?authSource=admin';
    
    logger.warn(`MongoDB URI not found in environment variables, using default: ${defaultUri}`);
    uri = defaultUri;
  }
  
  return uri;
};

// Connection options
const options = {
  serverSelectionTimeoutMS: 30000,
  connectTimeoutMS: 30000,
  socketTimeoutMS: 30000,
  // @ts-ignore - bufferTimeoutMS exists but TypeScript doesn't recognize it
  bufferTimeoutMS: 30000,
};

// Connect to MongoDB
export const connectToDatabase = async (): Promise<mongoose.Connection> => {
  try {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(getMongoUri(), options);
      logger.info('Connected to MongoDB');
    }
    return mongoose.connection;
  } catch (error) {
    logger.error('Failed to connect to MongoDB', { error });
    throw error;
  }
};

// Disconnect from MongoDB
export const disconnectFromDatabase = async (): Promise<void> => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
    logger.info('MongoDB connection closed');
  }
};

// Export the mongoose instance
export default mongoose; 