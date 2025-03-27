import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.test' });

/**
 * Direct test of MongoDB connectivity and operations
 */
async function testMongoDB() {
  console.log('Starting direct MongoDB test...');
  
  // Connect to MongoDB with explicit long timeouts
  const mongoUri = process.env.MONGODB_URI || 'mongodb://testadmin:testpassword@localhost:27018/agent-minder-test?authSource=admin';
  
  console.log(`Connecting to MongoDB: ${mongoUri}`);
  
  // Custom connection options with very long timeouts
  const connectionOptions = {
    serverSelectionTimeoutMS: 120000,  // 2 minutes
    connectTimeoutMS: 120000,          // 2 minutes
    socketTimeoutMS: 120000,           // 2 minutes
    maxPoolSize: 10,
    bufferCommands: true,
    // @ts-ignore - this option exists in mongoose but TypeScript doesn't recognize it
    bufferTimeoutMS: 120000,           // 2 minutes
  };
  
  try {
    await mongoose.connect(mongoUri, connectionOptions);
    console.log('Connected to MongoDB!');
    
    // Define a simple test schema
    const TestSchema = new mongoose.Schema({
      name: { type: String, required: true },
      createdAt: { type: Date, default: Date.now }
    });
    
    // Create a model from the schema
    const TestModel = mongoose.model('TestModel', TestSchema);
    
    console.log('Creating test document...');
    
    // Create and save a test document
    const testDoc = new TestModel({ name: 'Test Document' });
    const result = await testDoc.save();
    
    console.log(`Test document created with ID: ${result._id}`);
    
    // Verify we can retrieve the document
    const foundDoc = await TestModel.findById(result._id);
    
    if (foundDoc) {
      console.log(`Document found: ${foundDoc.name}`);
      
      // Clean up - delete the document
      await TestModel.findByIdAndDelete(result._id);
      console.log('Test document deleted');
    } else {
      console.error('Failed to find document!');
    }
    
    // Disconnect from MongoDB
    await mongoose.connection.close();
    console.log('Disconnected from MongoDB');
    
    console.log('✅ MongoDB direct test completed successfully!');
  } catch (error) {
    console.error('Error in MongoDB direct test:', error);
    // Ensure we disconnect even if there was an error
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
      console.log('Disconnected from MongoDB after error');
    }
  }
}

// Execute the test
testMongoDB().then(() => {
  console.log('Test complete.');
  process.exit(0);
}).catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
}); 