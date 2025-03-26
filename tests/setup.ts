import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.test' });

// Create .env.test file if it doesn't exist
process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/agent-minder-test';
process.env.PORT = process.env.PORT || '5000';
process.env.NODE_ENV = 'test';

// Increase timeout for all tests
jest.setTimeout(10000);

// Silence mongoose deprecation warnings during tests
mongoose.set('strictQuery', true);

// Global setup - runs once before all tests
beforeAll(async () => {
  // Connect to MongoDB test database
  if (!process.env.SKIP_DB_SETUP) {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/agent-minder-test';
    await mongoose.connect(mongoUri);
    console.log(`Connected to test database: ${mongoUri}`);
  }
});

// Global teardown - runs once after all tests
afterAll(async () => {
  // Disconnect from MongoDB test database
  if (!process.env.SKIP_DB_SETUP && mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
    console.log('Disconnected from test database');
  }
}); 