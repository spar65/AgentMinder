import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.test' });

async function testDatabaseConnection() {
  console.log('Testing connection to MongoDB...');
  const mongoUri = process.env.MONGODB_URI || 'mongodb://testadmin:testpassword@localhost:27018/agent-minder-test?authSource=admin';
  console.log(`MongoDB URI: ${mongoUri}`);
  
  try {
    // Connect to the database
    console.log('Attempting to connect...');
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
    });
    console.log('✅ Successfully connected to MongoDB!');
    
    // Create a test collection to verify write permissions
    console.log('Creating test collection...');
    const testSchema = new mongoose.Schema({
      name: String,
      timestamp: { type: Date, default: Date.now }
    });
    
    const TestModel = mongoose.model('Test', testSchema);
    
    // Try to write data
    console.log('Writing test document...');
    const testDocument = await TestModel.create({ name: 'connection-test' });
    console.log(`✅ Successfully wrote test document with ID: ${testDocument._id}`);
    
    // Try to read data
    console.log('Reading test document...');
    const foundDocument = await TestModel.findById(testDocument._id);
    console.log(`✅ Successfully read test document: ${foundDocument?.name}`);
    
    // List collections
    console.log('Listing collections...');
    if (mongoose.connection.db) {
      const collections = await mongoose.connection.db.collections();
      console.log(`Available collections (${collections.length}):`);
      for (const collection of collections) {
        console.log(`- ${collection.collectionName}`);
      }
    } else {
      console.log('Database connection not initialized yet.');
    }
    
    // Cleanup
    console.log('Cleaning up test collection...');
    await TestModel.deleteMany({});
    
    // Disconnect
    console.log('Disconnecting from MongoDB...');
    await mongoose.connection.close();
    console.log('✅ Connection test completed successfully!');
    
    return true;
  } catch (error) {
    console.error('❌ MongoDB connection test failed:', error);
    return false;
  }
}

// Run the test
testDatabaseConnection()
  .then(success => {
    if (success) {
      console.log('✅ Database connection test passed!');
      process.exit(0);
    } else {
      console.log('❌ Database connection test failed!');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('Unexpected error during test:', error);
    process.exit(1);
  }); 