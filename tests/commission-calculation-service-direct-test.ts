import mongoose from 'mongoose';
import dotenv from 'dotenv';
import CommissionStructure from '../src/models/CommissionStructure';
import CommissionCalculation from '../src/models/CommissionCalculation';
import CommissionCalculationService from '../src/services/CommissionCalculationService';
import AgentService from '../src/services/AgentService';

// Mock AgentService
jest.mock('../src/services/AgentService');

// Load environment variables
dotenv.config({ path: '.env.test' });

/**
 * Direct test of CommissionCalculationService
 */
async function testCommissionCalculationService() {
  console.log('Starting CommissionCalculationService direct test...');
  
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
    
    // Create test IDs
    const uniqueAgentId = new mongoose.Types.ObjectId().toString();
    const uniqueTransactionId = new mongoose.Types.ObjectId().toString();
    const uniqueCommissionStructureId = new mongoose.Types.ObjectId().toString();
    const uniqueCreatedById = new mongoose.Types.ObjectId().toString();
    const baseAmount = 100000;
    
    console.log('Generated test IDs:', {
      uniqueAgentId,
      uniqueTransactionId,
      uniqueCommissionStructureId
    });
    
    // Setup mock for AgentService
    const mockAgent = {
      _id: uniqueAgentId,
      commissionRate: 3,
    };
    (AgentService.getAgentById as jest.Mock).mockResolvedValue(mockAgent);
    console.log('Agent service mocked');
    
    // Create a commission structure
    console.log('Creating CommissionStructure...');
    const structureData = {
      _id: new mongoose.Types.ObjectId(uniqueCommissionStructureId),
      agent: new mongoose.Types.ObjectId(uniqueAgentId),
      baseRate: 6,
      tiers: [],
      isDefault: false,
      name: 'Test Commission Structure',
      createdBy: new mongoose.Types.ObjectId(uniqueCreatedById),
      effectiveDate: new Date(),
      bonusRules: []
    };
    
    const commissionStructure = await CommissionStructure.create(structureData);
    console.log('CommissionStructure created:', commissionStructure._id);
    
    // CommissionCalculationService is a singleton/static class, not a constructor
    console.log('Calling CommissionCalculationService.calculateCommission...');
    // Call the service directly
    const result = await CommissionCalculationService.calculateCommission(
      uniqueAgentId,
      uniqueTransactionId,
      baseAmount,
      uniqueCommissionStructureId
    );
    
    console.log('Successfully calculated commission:', {
      id: result._id,
      agent: result.agent.toString(),
      transaction: result.transaction.toString(),
      rate: result.rate,
      finalAmount: result.finalAmount
    });
    
    // Cleanup - delete created records
    await CommissionCalculation.findByIdAndDelete(result._id);
    await CommissionStructure.findByIdAndDelete(commissionStructure._id);
    console.log('Test data cleaned up');
    
    // Disconnect from MongoDB
    await mongoose.connection.close();
    console.log('Disconnected from MongoDB');
    
    console.log('✅ CommissionCalculationService direct test completed successfully!');
  } catch (error) {
    console.error('Error in CommissionCalculationService direct test:', error);
    // Ensure we disconnect even if there was an error
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
      console.log('Disconnected from MongoDB after error');
    }
  }
}

// Execute the test
testCommissionCalculationService().then(() => {
  console.log('Test complete.');
  process.exit(0);
}).catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
}); 