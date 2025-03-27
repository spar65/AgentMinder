import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

async function run() {
  console.log('Starting MongoDB memory server...');
  const mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  console.log(`MongoDB memory server started at: ${mongoUri}`);
  
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');
    
    // Create a simple schema
    const schema = new mongoose.Schema({
      name: String,
      value: Number
    });
    
    // Create a model
    const TestModel = mongoose.model('Test', schema);
    
    // Create a test document
    console.log('Creating a test document...');
    const testDoc = await TestModel.create({
      name: 'test',
      value: 42
    });
    console.log('Test document created:', testDoc);
    
    // Find the document
    console.log('Finding the test document...');
    const foundDoc = await TestModel.findOne({ name: 'test' });
    console.log('Found document:', foundDoc);
    
    // Clean up
    console.log('Cleaning up...');
    await mongoose.connection.close();
    await mongoServer.stop();
    console.log('Done!');
  } catch (error) {
    console.error('Error:', error);
  }
}

run().catch(console.error); 