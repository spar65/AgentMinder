import mongoose from 'mongoose';
import dotenv from 'dotenv';
import CommissionStructure from '../src/models/CommissionStructure';

// Load environment variables
dotenv.config({ path: '.env.test' });

/**
 * Direct test of CommissionStructure model operations
 */
async function testCommissionStructure() {
  console.log('Starting CommissionStructure direct test...');
  
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
    
    // Create required IDs
    const agentId = new mongoose.Types.ObjectId();
    const createdById = new mongoose.Types.ObjectId();
    
    console.log('Creating CommissionStructure document...');
    
    // Create required data for CommissionStructure
    const structureData = {
      name: 'Test Commission Structure',
      agent: agentId,
      baseRate: 5,
      tiers: [
        { threshold: 50000, rate: 6 }
      ],
      isDefault: false,
      createdBy: createdById,
      effectiveDate: new Date(),
      bonusRules: []
    };
    
    console.log('Structure data:', structureData);
    
    // Create and save a CommissionStructure document
    const result = await CommissionStructure.create(structureData);
    
    console.log(`CommissionStructure created with ID: ${result._id}`);
    
    // Verify we can retrieve the document
    const foundStructure = await CommissionStructure.findById(result._id);
    
    if (foundStructure) {
      console.log(`Structure found: ${foundStructure.name}`);
      console.log('Structure details:', {
        baseRate: foundStructure.baseRate,
        isDefault: foundStructure.isDefault,
        effectiveDate: foundStructure.effectiveDate,
        tiersCount: foundStructure.tiers?.length || 0
      });
      
      // Clean up - delete the document
      await CommissionStructure.findByIdAndDelete(result._id);
      console.log('Commission Structure deleted');
    } else {
      console.error('Failed to find the commission structure!');
    }
    
    // Disconnect from MongoDB
    await mongoose.connection.close();
    console.log('Disconnected from MongoDB');
    
    console.log('✅ CommissionStructure direct test completed successfully!');
  } catch (error) {
    console.error('Error in CommissionStructure direct test:', error);
    // Ensure we disconnect even if there was an error
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
      console.log('Disconnected from MongoDB after error');
    }
  }
}

// Execute the test
testCommissionStructure().then(() => {
  console.log('Test complete.');
  process.exit(0);
}).catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
}); 