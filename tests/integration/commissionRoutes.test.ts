import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../src/index';
import CommissionCalculation from '../../src/models/CommissionCalculation';
import CommissionStructure from '../../src/models/CommissionStructure';
import Agent from '../../src/models/Agent';

describe('Commission API Routes', () => {
  // Mock data
  const mockAgentId = new mongoose.Types.ObjectId();
  const mockTransactionId = new mongoose.Types.ObjectId();
  const mockCommissionId = new mongoose.Types.ObjectId();
  
  // Setup before tests
  beforeAll(async () => {
    // Create test data
    await Agent.create({
      _id: mockAgentId,
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.test@example.com',
      phoneNumber: '555-1234',
      commissionRate: 5
    });
  });
  
  // Cleanup after tests
  afterAll(async () => {
    await Agent.deleteMany({});
    await CommissionCalculation.deleteMany({});
    await CommissionStructure.deleteMany({});
    
    // Close MongoDB connection
    await mongoose.connection.close();
  });
  
  // Reset after each test
  afterEach(async () => {
    await CommissionCalculation.deleteMany({});
  });

  describe('POST /api/commissions/calculate', () => {
    it('should calculate commission successfully', async () => {
      const calculationData = {
        agent: mockAgentId.toString(),
        transaction: mockTransactionId.toString(),
        baseAmount: 100000
      };
      
      const response = await request(app)
        .post('/api/commissions/calculate')
        .send(calculationData)
        .expect(201);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('finalAmount');
      expect(response.body.data.agent.toString()).toBe(mockAgentId.toString());
      expect(response.body.data.baseAmount).toBe(100000);
    });
    
    it('should return 400 for invalid data', async () => {
      const invalidData = {
        agent: mockAgentId.toString(),
        // Missing transaction
        baseAmount: -100 // Invalid amount
      };
      
      const response = await request(app)
        .post('/api/commissions/calculate')
        .send(invalidData)
        .expect(400);
      
      expect(response.body.success).toBe(false);
    });
  });
  
  describe('GET /api/commissions', () => {
    beforeEach(async () => {
      // Create test commission calculations
      await CommissionCalculation.create({
        _id: mockCommissionId,
        agent: mockAgentId,
        transaction: mockTransactionId,
        baseAmount: 100000,
        rate: 5,
        finalAmount: 5000,
        status: 'pending'
      });
    });
    
    it('should get all commission calculations', async () => {
      const response = await request(app)
        .get('/api/commissions')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0]._id.toString()).toBe(mockCommissionId.toString());
    });
    
    it('should filter commissions by agent', async () => {
      const response = await request(app)
        .get(`/api/commissions?agent=${mockAgentId}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      
      // Test with non-matching agent ID
      const nonMatchingResponse = await request(app)
        .get(`/api/commissions?agent=${new mongoose.Types.ObjectId()}`)
        .expect(200);
      
      expect(nonMatchingResponse.body.data).toHaveLength(0);
    });
  });
  
  describe('POST /api/commissions/:id/adjustments', () => {
    beforeEach(async () => {
      // Create test commission calculation
      await CommissionCalculation.create({
        _id: mockCommissionId,
        agent: mockAgentId,
        transaction: mockTransactionId,
        baseAmount: 100000,
        rate: 5,
        finalAmount: 5000,
        status: 'pending'
      });
    });
    
    it('should apply adjustment to commission', async () => {
      const adjustmentData = {
        reason: 'Performance bonus',
        amount: 500,
        description: 'Exceeded sales target'
      };
      
      const response = await request(app)
        .post(`/api/commissions/${mockCommissionId}/adjustments`)
        .send(adjustmentData)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('adjustments');
      expect(response.body.data.adjustments).toHaveLength(1);
      expect(response.body.data.adjustments[0].reason).toBe('Performance bonus');
      expect(response.body.data.adjustments[0].amount).toBe(500);
      expect(response.body.data.finalAmount).toBe(5500); // 5000 + 500
    });
    
    it('should return 404 for non-existent commission', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const adjustmentData = {
        reason: 'Performance bonus',
        amount: 500
      };
      
      const response = await request(app)
        .post(`/api/commissions/${nonExistentId}/adjustments`)
        .send(adjustmentData)
        .expect(404);
      
      expect(response.body.success).toBe(false);
    });
  });
}); 