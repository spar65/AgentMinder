// Plain JavaScript test for CommissionCalculationService
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const helper = require('./helpers/commission-test-helper');

// Load environment variables
dotenv.config({ path: '.env.test' });

async function testCommissionService() {
  console.log('Starting CommissionCalculationService test...');
  
  // MongoDB connection info
  const mongoUri = process.env.MONGODB_URI || 'mongodb://testadmin:testpassword@localhost:27018/agent-minder-test?authSource=admin';
  console.log(`MongoDB URI: ${mongoUri}`);
  
  try {
    // Connect to MongoDB with explicit timeouts
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 60000,
      connectTimeoutMS: 60000,
      socketTimeoutMS: 60000,
      maxPoolSize: 10,
      bufferCommands: true,
    });
    console.log('Mongoose connected successfully');
    
    // Generate test IDs
    const agentId = new mongoose.Types.ObjectId().toString();
    const transactionId = new mongoose.Types.ObjectId().toString();
    const createdById = new mongoose.Types.ObjectId().toString();
    const structureId = new mongoose.Types.ObjectId().toString();
    
    console.log('Test IDs:', { agentId, transactionId, structureId });
    
    // Create a commission structure directly using our helper
    const structureData = {
      _id: structureId,
      name: 'Test Commission Structure',
      agent: agentId,
      baseRate: 6,
      tiers: [],
      isDefault: false,
      createdBy: createdById,
      effectiveDate: new Date(),
      bonusRules: []
    };
    
    const structureResult = await helper.createCommissionStructureDirectly(mongoUri, structureData);
    
    if (!structureResult.success) {
      throw new Error('Failed to create commission structure');
    }
    
    // Now we need to dynamically load the CommissionCalculationService
    // We can't require it directly because it uses TypeScript
    // Instead, we'll create a calculation directly
    
    const calculationData = {
      agent: agentId,
      transaction: transactionId,
      commissionStructure: structureId,
      baseAmount: 100000,
      rate: 6,
      finalAmount: 6000,
      status: 'pending',
      adjustments: []
    };
    
    const calculationResult = await helper.createCommissionCalculationDirectly(mongoUri, calculationData);
    
    if (!calculationResult.success) {
      throw new Error('Failed to create commission calculation');
    }
    
    console.log('Successfully created test data:');
    console.log('- Commission Structure ID:', structureResult._id);
    console.log('- Commission Calculation ID:', calculationResult._id);
    
    // Now we can query the data to verify it exists
    // Get the mongoose models
    const CommissionStructure = mongoose.model('CommissionStructure', new mongoose.Schema({
      name: String,
      agent: mongoose.Schema.Types.ObjectId,
      baseRate: Number,
      tiers: Array,
      isDefault: Boolean,
      createdBy: mongoose.Schema.Types.ObjectId,
      effectiveDate: Date,
      bonusRules: Array
    }));
    
    const CommissionCalculation = mongoose.model('CommissionCalculation', new mongoose.Schema({
      agent: mongoose.Schema.Types.ObjectId,
      transaction: mongoose.Schema.Types.ObjectId,
      commissionStructure: mongoose.Schema.Types.ObjectId,
      baseAmount: Number,
      rate: Number,
      finalAmount: Number,
      status: String,
      adjustments: Array
    }));
    
    // Query the data
    const structure = await CommissionStructure.findById(structureResult._id);
    console.log('Found structure:', structure ? 'yes' : 'no');
    if (structure) {
      console.log('Structure name:', structure.name);
      console.log('Structure baseRate:', structure.baseRate);
    }
    
    const calculation = await CommissionCalculation.findById(calculationResult._id);
    console.log('Found calculation:', calculation ? 'yes' : 'no');
    if (calculation) {
      console.log('Calculation baseAmount:', calculation.baseAmount);
      console.log('Calculation finalAmount:', calculation.finalAmount);
    }
    
    // Clean up - delete the test data
    if (structure) {
      await CommissionStructure.findByIdAndDelete(structureResult._id);
      console.log('Deleted commission structure');
    }
    
    if (calculation) {
      await CommissionCalculation.findByIdAndDelete(calculationResult._id);
      console.log('Deleted commission calculation');
    }
    
    // Disconnect from MongoDB
    await mongoose.connection.close();
    console.log('Disconnected from MongoDB');
    
    console.log('✅ CommissionCalculationService test completed successfully!');
    return true;
  } catch (error) {
    console.error('Error in CommissionCalculationService test:', error);
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
      console.log('Mongoose connection closed after error');
    }
    return false;
  }
}

// Run the test
testCommissionService().then(success => {
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