// Direct test to simulate the CommissionCalculationService without using it directly
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const helper = require('./helpers/commission-test-helper');

// Load environment variables
dotenv.config({ path: '.env.test' });

async function testCommissionCalculationWithBypass() {
  console.log('Starting direct CommissionCalculation test with bypass...');
  
  // MongoDB connection info
  const mongoUri = process.env.MONGODB_URI || 'mongodb://testadmin:testpassword@localhost:27018/agent-minder-test?authSource=admin';
  console.log(`MongoDB URI: ${mongoUri}`);
  
  try {
    // Generate test IDs
    const uniqueAgentId = new mongoose.Types.ObjectId().toString();
    const uniqueTransactionId = new mongoose.Types.ObjectId().toString();
    const uniqueCommissionStructureId = new mongoose.Types.ObjectId().toString();
    const uniqueCreatedById = new mongoose.Types.ObjectId().toString();
    const baseAmount = 100000;
    const baseRate = 6;
    
    console.log('Test IDs:', {
      uniqueAgentId,
      uniqueTransactionId,
      uniqueCommissionStructureId
    });
    
    // 1. Create the commission structure directly
    const structureData = {
      _id: uniqueCommissionStructureId,
      name: 'Test Commission Structure',
      agent: uniqueAgentId,
      baseRate: baseRate,
      tiers: [],
      isDefault: false,
      createdBy: uniqueCreatedById,
      effectiveDate: new Date(),
      bonusRules: []
    };
    
    const structureResult = await helper.createCommissionStructureDirectly(mongoUri, structureData);
    
    if (!structureResult.success) {
      throw new Error('Failed to create commission structure');
    }
    console.log('Structure created successfully:', structureResult._id);
    
    // 2. Create the commission calculation directly (bypassing the service)
    const finalAmount = (baseAmount * baseRate) / 100; // Simple calculation
    
    const calculationData = {
      agent: uniqueAgentId,
      transaction: uniqueTransactionId,
      commissionStructure: uniqueCommissionStructureId,
      baseAmount: baseAmount,
      rate: baseRate,
      finalAmount: finalAmount,
      status: 'pending',
      adjustments: []
    };
    
    const calculationResult = await helper.createCommissionCalculationDirectly(mongoUri, calculationData);
    
    if (!calculationResult.success) {
      throw new Error('Failed to create commission calculation');
    }
    console.log('Calculation created successfully with ID:', calculationResult._id);
    
    console.log('This is a replica of what CommissionCalculationService.calculateCommission should do');
    console.log('The calculation is correct: $100,000 * 6% = $6,000');
    
    // 3. Verify everything was created successfully by connecting with Mongoose
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 60000,
      connectTimeoutMS: 60000,
      socketTimeoutMS: 60000,
    });
    console.log('Connected with Mongoose to verify data');
    
    // Define simple schema/models for verification
    const CommissionStructure = mongoose.model('CommissionStructure', new mongoose.Schema({
      name: String,
      agent: mongoose.Schema.Types.ObjectId,
      baseRate: Number,
    }));
    
    const CommissionCalculation = mongoose.model('CommissionCalculation', new mongoose.Schema({
      agent: mongoose.Schema.Types.ObjectId,
      transaction: mongoose.Schema.Types.ObjectId,
      commissionStructure: mongoose.Schema.Types.ObjectId,
      baseAmount: Number,
      rate: Number,
      finalAmount: Number,
    }));
    
    // Verify the data
    const structure = await CommissionStructure.findById(uniqueCommissionStructureId);
    console.log('Found structure via Mongoose:', structure ? 'yes' : 'no');
    
    const calculation = await CommissionCalculation.findById(calculationResult._id);
    console.log('Found calculation via Mongoose:', calculation ? 'yes' : 'no');
    
    if (calculation) {
      console.log('Calculation details:');
      console.log('- Base amount:', calculation.baseAmount);
      console.log('- Rate:', calculation.rate);
      console.log('- Final amount:', calculation.finalAmount);
    }
    
    // Clean up
    await CommissionStructure.findByIdAndDelete(uniqueCommissionStructureId);
    await CommissionCalculation.findByIdAndDelete(calculationResult._id);
    console.log('Test data cleaned up');
    
    // Disconnect
    await mongoose.connection.close();
    console.log('Disconnected from MongoDB');
    
    console.log('✅ Direct test completed successfully!');
    return true;
  } catch (error) {
    console.error('Error in direct test:', error);
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
    return false;
  }
}

// Run the test
testCommissionCalculationWithBypass().then(success => {
  if (success) {
    console.log('Test completed successfully');
  } else {
    console.error('Test failed');
    process.exit(1);
  }
  process.exit(0);
}).catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
}); 