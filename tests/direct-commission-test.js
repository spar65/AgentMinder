// Direct manual test for CommissionCalculationService
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { default: CommissionCalculationService } = require('../dist/services/CommissionCalculationService');
const { default: CommissionCalculation } = require('../dist/models/CommissionCalculation');
const { default: CommissionStructure } = require('../dist/models/CommissionStructure');
const { default: AgentService } = require('../dist/services/AgentService');

// Load environment variables
dotenv.config({ path: '.env.test' });

// Override AgentService to avoid authentication issues
AgentService.getAgentById = async (id) => {
  console.log(`Mock getAgentById called with: ${id}`);
  return {
    _id: id,
    firstName: 'Test',
    lastName: 'Agent',
    email: 'test@example.com',
    commissionRate: 5
  };
};

async function runTest() {
  console.log('Starting direct commission test...');
  
  const mongoUri = process.env.MONGODB_URI || 'mongodb://testadmin:testpassword@localhost:27018/agent-minder-test?authSource=admin';
  console.log(`MongoDB URI: ${mongoUri}`);
  
  try {
    // Connect to database with longer timeouts
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 30000,
      connectTimeoutMS: 30000,
      socketTimeoutMS: 30000,
    });
    console.log('Connected to MongoDB');
    
    // Generate test IDs
    const agentId = new mongoose.Types.ObjectId().toString();
    const transactionId = new mongoose.Types.ObjectId().toString();
    const structureId = new mongoose.Types.ObjectId().toString();
    const baseAmount = 100000;
    
    console.log('Test IDs:', {
      agentId,
      transactionId, 
      structureId
    });
    
    // Create a commission structure
    console.log('Creating test commission structure...');
    const structure = new CommissionStructure({
      _id: structureId,
      name: 'Test Commission Structure',
      agent: agentId,
      baseRate: 6,
      tiers: [
        { threshold: 50000, rate: 7 },
        { threshold: 150000, rate: 8 }
      ],
      isDefault: false,
      createdBy: new mongoose.Types.ObjectId(),
      effectiveDate: new Date()
    });
    
    await structure.save();
    console.log('Commission structure created successfully');
    
    // Run test cases
    console.log('\nTest 1: Calculate with agent base rate (no structure)');
    const result1 = await CommissionCalculationService.calculateCommission(
      agentId,
      transactionId,
      baseAmount
    );
    
    console.log('Result 1:', {
      baseAmount: result1.baseAmount,
      rate: result1.rate,
      finalAmount: result1.finalAmount
    });
    
    console.log('\nTest 2: Calculate with structure');
    const result2 = await CommissionCalculationService.calculateCommission(
      agentId,
      transactionId,
      baseAmount,
      structureId
    );
    
    console.log('Result 2:', {
      baseAmount: result2.baseAmount,
      rate: result2.rate,
      finalAmount: result2.finalAmount
    });
    
    console.log('\nTest 3: Calculate with tiered rate');
    const result3 = await CommissionCalculationService.calculateCommission(
      agentId,
      transactionId,
      75000, // Between 50k and 150k tiers
      structureId
    );
    
    console.log('Result 3:', {
      baseAmount: result3.baseAmount,
      rate: result3.rate,
      finalAmount: result3.finalAmount
    });
    
    // Make sure we have the needed IDs for next tests
    const calculationId = result1._id.toString();
    console.log('Calculation ID for further tests:', calculationId);
    
    console.log('\nTest 4: Get by ID');
    const getResult = await CommissionCalculationService.getById(calculationId);
    
    console.log('Get Result:', {
      id: getResult._id.toString(),
      baseAmount: getResult.baseAmount,
      rate: getResult.rate,
      finalAmount: getResult.finalAmount
    });
    
    console.log('\nTest 5: Apply adjustment');
    const adjustResult = await CommissionCalculationService.applyAdjustment(
      calculationId,
      'Test adjustment',
      500
    );
    
    console.log('Adjustment Result:', {
      baseAmount: adjustResult.baseAmount,
      rate: adjustResult.rate,
      finalAmount: adjustResult.finalAmount,
      adjustments: adjustResult.adjustments.length
    });
    
    // Clean up
    console.log('\nCleaning up test data...');
    await CommissionCalculation.deleteMany({ agent: agentId });
    await CommissionStructure.findByIdAndDelete(structureId);
    
    // Disconnect
    await mongoose.connection.close();
    console.log('Test completed successfully!');
    return true;
  } catch (error) {
    console.error('Test failed with error:', error);
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
    return false;
  }
}

// Run the test and exit
runTest()
  .then(success => {
    if (success) {
      console.log('✅ All tests passed!');
      process.exit(0);
    } else {
      console.error('❌ Tests failed!');
      process.exit(1);
    }
  })
  .catch(err => {
    console.error('Unhandled error:', err);
    process.exit(1);
  }); 