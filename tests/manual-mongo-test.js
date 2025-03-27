// Plain JavaScript test for MongoDB without TypeScript
const mongoose = require('mongoose');
const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.test' });

async function testMongoDB() {
  console.log('Starting MongoDB manual test...');
  
  // Get MongoDB URI from environment
  const mongoUri = process.env.MONGODB_URI || 'mongodb://testadmin:testpassword@localhost:27018/agent-minder-test?authSource=admin';
  console.log(`MongoDB URI: ${mongoUri}`);
  
  try {
    // Test native MongoDB driver first
    console.log('Testing with native MongoDB driver...');
    const client = new MongoClient(mongoUri, {
      serverSelectionTimeoutMS: 60000,
      connectTimeoutMS: 60000,
      socketTimeoutMS: 60000,
    });
    
    await client.connect();
    console.log('Connected to MongoDB with native driver!');
    
    // List databases
    const adminDb = client.db('admin');
    const dbs = await adminDb.admin().listDatabases();
    console.log('Available databases:');
    dbs.databases.forEach(db => {
      console.log(`- ${db.name}`);
    });
    
    // Create a test document in a test collection
    const testDb = client.db('agent-minder-test');
    const testCollection = testDb.collection('manual_tests');
    
    console.log('Creating test document with native driver...');
    const insertResult = await testCollection.insertOne({
      name: 'Native Driver Test',
      timestamp: new Date()
    });
    console.log(`Native driver document created with ID: ${insertResult.insertedId}`);
    
    // Find the document
    const foundDoc = await testCollection.findOne({ _id: insertResult.insertedId });
    if (foundDoc) {
      console.log(`Found test document: ${foundDoc.name}`);
    }
    
    // Delete the document
    await testCollection.deleteOne({ _id: insertResult.insertedId });
    console.log('Test document deleted');
    
    // Close native driver connection
    await client.close();
    console.log('Native driver connection closed');
    
    // Now test Mongoose
    console.log('\nTesting with Mongoose...');
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 60000,
      connectTimeoutMS: 60000,
      socketTimeoutMS: 60000,
      bufferCommands: true,
      // Use older MongoDB API
      useNewUrlParser: true,
    });
    console.log('Connected to MongoDB with Mongoose!');
    
    // Create a simple schema and model
    const TestSchema = new mongoose.Schema({
      name: String,
      createdAt: { type: Date, default: Date.now }
    });
    
    // Remove model if it exists to avoid errors
    mongoose.deleteModel(/TestModel/);
    const TestModel = mongoose.model('TestModel', TestSchema);
    
    // Create a document
    console.log('Creating test document with Mongoose...');
    const testDoc = new TestModel({ name: 'Mongoose Test' });
    const saveResult = await testDoc.save();
    console.log(`Mongoose document created with ID: ${saveResult._id}`);
    
    // Find the document
    const foundMongooseDoc = await TestModel.findById(saveResult._id);
    if (foundMongooseDoc) {
      console.log(`Found Mongoose test document: ${foundMongooseDoc.name}`);
    }
    
    // Delete the document
    await TestModel.findByIdAndDelete(saveResult._id);
    console.log('Mongoose test document deleted');
    
    // Close Mongoose connection
    await mongoose.connection.close();
    console.log('Mongoose connection closed');
    
    console.log('\n✅ Manual MongoDB test completed successfully!');
    return true;
  } catch (error) {
    console.error('Error in manual MongoDB test:', error);
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
      console.log('Mongoose connection closed after error');
    }
    return false;
  }
}

// Run the test
testMongoDB().then(success => {
  if (success) {
    console.log('Test completed successfully.');
  } else {
    console.error('Test failed.');
    process.exit(1);
  }
  process.exit(0);
}).catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
}); 