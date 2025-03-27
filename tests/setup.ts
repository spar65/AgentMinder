import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.test' });

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.PORT = process.env.PORT || '5000';

// Increase timeout for all tests
jest.setTimeout(60000); // Increase timeout to 60 seconds

// Silence mongoose deprecation warnings during tests
mongoose.set('strictQuery', true);

// Database connection options
const dbOptions = {
  serverSelectionTimeoutMS: 60000, // Increase timeout for server selection
  connectTimeoutMS: 60000,         // Increase connection timeout
  socketTimeoutMS: 60000,          // Increase socket timeout
  heartbeatFrequencyMS: 10000,     // Check server status more frequently
  maxPoolSize: 10,                 // Increase connection pool size
  family: 4,                       // Use IPv4 (avoid IPv6 issues)
};

// Global setup - runs once before all tests
beforeAll(async () => {
  // Connect to the test database
  if (!process.env.SKIP_DB_SETUP) {
    console.log('Connecting to MongoDB test instance...');
    const mongoUri = process.env.MONGODB_URI || 'mongodb://testadmin:testpassword@localhost:27018/agent-minder-test?authSource=admin';
    
    // Retry connection logic
    let connected = false;
    let retryCount = 0;
    const maxRetries = 5;
    
    while (!connected && retryCount < maxRetries) {
      try {
        console.log(`MongoDB URI: ${mongoUri} (Attempt ${retryCount + 1}/${maxRetries})`);
        
        // Close any existing connections first
        if (mongoose.connection.readyState !== 0) {
          console.log('Closing existing MongoDB connection...');
          await mongoose.connection.close();
        }
        
        // Connect with updated options
        await mongoose.connect(mongoUri, {
          ...dbOptions,
          // Explicitly set buffer command timeout
          bufferCommands: true,
          // @ts-ignore - bufferTimeoutMS exists but TypeScript doesn't recognize it
          bufferTimeoutMS: 60000,
        });
        
        connected = true;
        console.log('Connected to MongoDB test instance successfully!');
        
        // Print connection status
        console.log(`MongoDB connection status: ${mongoose.connection.readyState}`);
        console.log(`Connected to: ${mongoose.connection.name}`);
        
        // Try a simple query to verify connection
        if (mongoose.connection.db) {
          const collections = await mongoose.connection.db.listCollections().toArray();
          console.log(`Connected to database with ${collections.length} collections`);
        }
      } catch (error) {
        retryCount++;
        console.error(`Error connecting to MongoDB test instance (attempt ${retryCount}/${maxRetries}):`, error);
        
        if (retryCount >= maxRetries) {
          console.error('Max connection attempts reached. Failing tests.');
          throw error; // Re-throw to fail tests if DB connection fails after max retries
        }
        
        // Wait before retrying
        console.log(`Waiting 2 seconds before retrying...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }
});

// Global teardown - runs once after all tests
afterAll(async () => {
  // Disconnect from the test database
  if (!process.env.SKIP_DB_SETUP && mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
    console.log('Disconnected from MongoDB test instance');
  }
});

// Clear database collections between tests
afterEach(async () => {
  if (!process.env.SKIP_DB_SETUP && mongoose.connection.readyState !== 0) {
    const collections = mongoose.connection.collections;
    
    for (const key in collections) {
      const collection = collections[key];
      await collection.deleteMany({});
    }
    console.log('Cleared all collections after test');
  }
}); 