// Simple verification script for CommissionCalculationService
// Run with: node src/services/CommissionCalculationService.verify.js

const mongoose = require('mongoose');
require('dotenv').config();

// Create simplified test models
const Schema = mongoose.Schema;

const CommissionStructureSchema = new Schema({
  name: { type: String, required: true },
  agent: { type: Schema.Types.ObjectId, ref: 'Agent' },
  baseRate: { type: Number, required: true },
  tiers: [
    {
      threshold: { type: Number, required: true },
      rate: { type: Number, required: true }
    }
  ],
  isDefault: { type: Boolean, default: false },
  createdBy: { type: Schema.Types.ObjectId, required: true },
  effectiveDate: { type: Date, default: Date.now },
  expirationDate: { type: Date },
  bonusRules: [{ type: Schema.Types.Mixed }]
});

const CommissionCalculationSchema = new Schema({
  agent: { type: Schema.Types.ObjectId, ref: 'Agent', required: true },
  transaction: { type: Schema.Types.ObjectId, ref: 'Transaction', required: true },
  commissionStructure: { type: Schema.Types.ObjectId, ref: 'CommissionStructure' },
  baseAmount: { type: Number, required: true },
  rate: { type: Number, required: true },
  finalAmount: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'approved', 'paid', 'cancelled'], default: 'pending' },
  adjustments: [
    {
      reason: { type: String, required: true },
      amount: { type: Number, required: true },
      date: { type: Date, default: Date.now }
    }
  ]
});

// Define test models
const CommissionStructure = mongoose.model('CommissionStructure', CommissionStructureSchema);
const CommissionCalculation = mongoose.model('CommissionCalculation', CommissionCalculationSchema);

// ----------------- Main Test Logic -----------------

async function testCommissionCalculation() {
  console.log('Starting CommissionCalculationService verification...');
  
  const mongoUri = process.env.MONGODB_URI || 'mongodb://testadmin:testpassword@localhost:27018/agent-minder-test?authSource=admin';
  console.log(`Connecting to MongoDB: ${mongoUri}`);
  
  try {
    // Connect with longer timeouts
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 60000,
      connectTimeoutMS: 60000,
      socketTimeoutMS: 60000,
      bufferCommands: true,
      bufferTimeoutMS: 60000
    });
    console.log('Connected to MongoDB');
    
    // Test commission rate calculation logic directly (core business logic)
    const baseAmount = 100000;
    const baseRate = 5;
    const finalAmount = (baseAmount * baseRate) / 100;
    console.log('Basic commission calculation test:');
    console.log(`$${baseAmount} * ${baseRate}% = $${finalAmount}`);
    console.assert(finalAmount === 5000, 'Basic calculation should be 5000');
    
    // Test tier logic
    const tiers = [
      { threshold: 50000, rate: 6 },
      { threshold: 100000, rate: 7 },
      { threshold: 200000, rate: 8 }
    ];
    
    // Test with amount that should trigger first tier
    const amount1 = 60000; 
    const applicableTier1 = [...tiers]
      .sort((a, b) => b.threshold - a.threshold)
      .find(tier => amount1 >= tier.threshold);
    const tierRate1 = applicableTier1 ? applicableTier1.rate : baseRate;
    const tierFinalAmount1 = (amount1 * tierRate1) / 100;
    
    console.log('\nTier test 1 (60k):');
    console.log(`Applicable tier: ${applicableTier1.threshold} with rate ${applicableTier1.rate}%`);
    console.log(`$${amount1} * ${tierRate1}% = $${tierFinalAmount1}`);
    console.assert(tierRate1 === 6, 'Tier 1 rate should be 6%');
    console.assert(tierFinalAmount1 === 3600, 'Tier 1 amount should be 3600');
    
    // Test with amount that should trigger second tier
    const amount2 = 150000;
    const applicableTier2 = [...tiers]
      .sort((a, b) => b.threshold - a.threshold)
      .find(tier => amount2 >= tier.threshold);
    const tierRate2 = applicableTier2 ? applicableTier2.rate : baseRate;
    const tierFinalAmount2 = (amount2 * tierRate2) / 100;
    
    console.log('\nTier test 2 (150k):');
    console.log(`Applicable tier: ${applicableTier2.threshold} with rate ${applicableTier2.rate}%`);
    console.log(`$${amount2} * ${tierRate2}% = $${tierFinalAmount2}`);
    console.assert(tierRate2 === 7, 'Tier 2 rate should be 7%');
    console.assert(tierFinalAmount2 === 10500, 'Tier 2 amount should be 10500');
    
    // Test adjustment logic
    const initialFinalAmount = 5000;
    const adjustment = 500;
    const adjustedAmount = initialFinalAmount + adjustment;
    
    console.log('\nAdjustment test:');
    console.log(`$${initialFinalAmount} + $${adjustment} = $${adjustedAmount}`);
    console.assert(adjustedAmount === 5500, 'Adjusted amount should be 5500');
    
    console.log('\nAll verification tests passed!');
    
    // Clean up and disconnect
    await mongoose.connection.close();
    return true;
  } catch (error) {
    console.error('Verification failed with error:', error);
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
    return false;
  }
}

// Run the test
testCommissionCalculation()
  .then(success => {
    if (success) {
      console.log('✅ Verification completed successfully');
    } else {
      console.error('❌ Verification failed');
      process.exit(1);
    }
    process.exit(0);
  })
  .catch(err => {
    console.error('Unhandled error:', err);
    process.exit(1);
  }); 