import mongoose from 'mongoose';
import { ApiError } from '../../../src/middleware/errorHandler';
import CommissionCalculationService from '../../../src/services/CommissionCalculationService';
import CommissionCalculation, { CommissionStatus } from '../../../src/models/CommissionCalculation';
import CommissionStructure from '../../../src/models/CommissionStructure';
import agentService from '../../../src/services/AgentService';

// Mock AgentService since we don't need to test that functionality
jest.mock('../../../src/services/AgentService');

// Set a much longer timeout for these tests to prevent timeouts
jest.setTimeout(60000);

describe('CommissionCalculationService', () => {
  // Clean up database before and after tests
  beforeAll(async () => {
    // Configure MongoDB connection with longer timeouts
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://testadmin:testpassword@localhost:27018/agent-minder-test?authSource=admin', {
      serverSelectionTimeoutMS: 30000,
      connectTimeoutMS: 30000,
      socketTimeoutMS: 30000,
      // @ts-ignore - bufferTimeoutMS exists but TypeScript doesn't recognize it
      bufferTimeoutMS: 30000,
    });
    
    // Clean collections
    await CommissionCalculation.deleteMany({});
    await CommissionStructure.deleteMany({});
  });
  
  afterAll(async () => {
    // Clean up and close connection
    await CommissionCalculation.deleteMany({});
    await CommissionStructure.deleteMany({});
    await mongoose.connection.close();
  });
  
  // Basic test of the core calculation logic
  it('should calculate commission correctly with base rate', async () => {
    // ARRANGE
    const agentId = new mongoose.Types.ObjectId().toString();
    const transactionId = new mongoose.Types.ObjectId().toString();
    const baseAmount = 100000;
    
    // Mock AgentService to provide a test agent
    const mockAgent = {
      _id: agentId,
      commissionRate: 5
    };
    (agentService.getAgentById as jest.Mock).mockResolvedValue(mockAgent);
    
    // ACT
    const result = await CommissionCalculationService.calculateCommission(
      agentId,
      transactionId,
      baseAmount
    );
    
    // ASSERT
    expect(result).toBeDefined();
    expect(result.baseAmount).toBe(baseAmount);
    expect(result.rate).toBe(5);
    expect(result.finalAmount).toBe(5000); // 5% of 100000
    
    // CLEANUP - explicitly remove the created record
    if (result._id) {
      await CommissionCalculation.findByIdAndDelete(result._id);
    }
  });
  
  // Test with a specific commission structure
  it('should calculate commission correctly with a specified structure', async () => {
    // ARRANGE
    const agentId = new mongoose.Types.ObjectId().toString();
    const transactionId = new mongoose.Types.ObjectId().toString();
    const baseAmount = 100000;
    
    // Mock AgentService
    const mockAgent = {
      _id: agentId,
      commissionRate: 3 // Base rate is lower than the structure rate
    };
    (agentService.getAgentById as jest.Mock).mockResolvedValue(mockAgent);
    
    // Create a real commission structure for testing
    const structure = new CommissionStructure({
      name: 'Test Structure',
      agent: agentId,
      baseRate: 6,
      tiers: [],
      isDefault: false,
      createdBy: new mongoose.Types.ObjectId(),
      effectiveDate: new Date()
    });
    await structure.save();
    
    // Get the structure ID as a string
    const structureId = structure._id ? structure._id.toString() : '';
    
    // ACT
    const result = await CommissionCalculationService.calculateCommission(
      agentId,
      transactionId,
      baseAmount,
      structureId
    );
    
    // ASSERT
    expect(result).toBeDefined();
    expect(result.baseAmount).toBe(baseAmount);
    expect(result.rate).toBe(6); // Should use structure rate
    expect(result.finalAmount).toBe(6000); // 6% of 100000
    
    // CLEANUP
    if (result._id) {
      await CommissionCalculation.findByIdAndDelete(result._id);
    }
    await CommissionStructure.findByIdAndDelete(structure._id);
  });
  
  // Test with tiered rates
  it('should calculate commission correctly with tiered rates', async () => {
    // ARRANGE
    const agentId = new mongoose.Types.ObjectId().toString();
    const transactionId = new mongoose.Types.ObjectId().toString();
    const baseAmount = 75000; // Between tier thresholds
    
    // Mock AgentService
    const mockAgent = {
      _id: agentId,
      commissionRate: 3
    };
    (agentService.getAgentById as jest.Mock).mockResolvedValue(mockAgent);
    
    // Create a commission structure with tiers
    const structure = new CommissionStructure({
      name: 'Tiered Test Structure',
      agent: agentId,
      baseRate: 5,
      tiers: [
        { min: 50000, max: 99999, rate: 7 },
        { min: 100000, max: null, rate: 8 }
      ],
      isDefault: false,
      createdBy: new mongoose.Types.ObjectId(),
      effectiveDate: new Date()
    });
    await structure.save();
    
    // Get the structure ID as a string
    const structureId = structure._id ? structure._id.toString() : '';
    
    // ACT
    const result = await CommissionCalculationService.calculateCommission(
      agentId,
      transactionId,
      baseAmount,
      structureId
    );
    
    // ASSERT
    expect(result).toBeDefined();
    expect(result.baseAmount).toBe(baseAmount);
    expect(result.rate).toBe(7); // Should use 50k tier
    expect(result.finalAmount).toBe(5250); // 7% of 75000
    
    // CLEANUP
    if (result._id) {
      await CommissionCalculation.findByIdAndDelete(result._id);
    }
    await CommissionStructure.findByIdAndDelete(structure._id);
  });
}); 