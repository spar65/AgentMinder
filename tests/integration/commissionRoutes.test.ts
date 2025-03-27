import request from 'supertest';
import mongoose from 'mongoose';
import { app, startServer, stopServer } from '../../src/index';
import Agent from '../../src/models/Agent';
import CommissionCalculation from '../../src/models/CommissionCalculation';
import CommissionStructure from '../../src/models/CommissionStructure';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { Server } from 'http';

// Load environment variables for tests
dotenv.config({ path: '.env.test' });

// Longer timeout for integration tests
jest.setTimeout(60000);

// Generate a random email to avoid duplicate key errors
const generateRandomEmail = () => {
  const randomString = Math.random().toString(36).substring(2, 10);
  return `test-${randomString}@example.com`;
};

describe('Commission API Routes', () => {
  let authToken: string;
  let testAgentId: string;
  let structureId: string;
  let server: Server;
  
  // Start server and set up test data before tests
  beforeAll(async () => {
    // Start the server
    try {
      server = await startServer();
      console.log('Test server started successfully');
    } catch (error) {
      console.error('Failed to start test server:', error);
      throw error; // Fail the test if we can't start the server
    }
    
    // Clear all previous test data
    try {
      await Agent.deleteMany({});
      await CommissionCalculation.deleteMany({});
      await CommissionStructure.deleteMany({});
      console.log('Test database cleared');
    } catch (error) {
      console.error('Failed to clear test database:', error);
    }
    
    // Create test agent
    try {
      const agent = new Agent({
        firstName: 'Test',
        lastName: 'Agent',
        email: generateRandomEmail(),
        phoneNumber: '123-456-7890',
        password: 'TestPassword123',
        commissionRate: 5,
        status: 'active',
        joinDate: new Date()
      });
      await agent.save();
      testAgentId = agent._id ? agent._id.toString() : '';
      console.log('Test agent created with ID:', testAgentId);
      
      // Create a commission structure
      const structure = new CommissionStructure({
        name: 'Test Structure',
        agent: testAgentId,
        baseRate: 5,
        isDefault: true,
        effectiveDate: new Date(),
        createdBy: testAgentId
      });
      await structure.save();
      structureId = structure._id ? structure._id.toString() : '';
      console.log('Test commission structure created with ID:', structureId);
      
      // Create JWT token for authenticated requests
      const jwtSecret = process.env.JWT_SECRET || 'test-secret-key';
      authToken = jwt.sign({ id: testAgentId, role: 'admin' }, jwtSecret, { expiresIn: '1h' });
    } catch (error) {
      console.error('Failed to create test data:', error);
      throw error; // Fail the test if we can't create the test data
    }
  });
  
  // Clean up after all tests
  afterAll(async () => {
    // Use the stopServer function to properly close server and connections
    await stopServer();
    console.log('Server and connections closed successfully');
  });
  
  // Reset after each test
  afterEach(async () => {
    await CommissionCalculation.deleteMany({});
  });
  
  describe('POST /api/commissions/calculate', () => {
    it('should calculate commission successfully', async () => {
      // Create the request body with correct field names
      const transactionId = new mongoose.Types.ObjectId().toString();
      const requestBody = {
        agent: testAgentId,
        transaction: transactionId,
        baseAmount: 100000,
        commissionStructure: structureId,
        rate: 5
      };
      
      console.log('Request body:', requestBody);
      
      const response = await request(app)
        .post('/api/commissions/calculate')
        .set('Authorization', `Bearer ${authToken}`)
        .send(requestBody);
      
      console.log('Response status:', response.status);
      console.log('Response body:', response.body);
      
      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('baseAmount', 100000);
      expect(response.body.data).toHaveProperty('rate', 5);
      expect(response.body.data).toHaveProperty('finalAmount', 5000);
    });
    
    it('should return 400 for invalid data', async () => {
      const response = await request(app)
        .post('/api/commissions/calculate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          agent: testAgentId,
          // Missing transaction
          baseAmount: 100000
        });
      
      expect(response.status).toBe(400);
    });
  });
  
  describe('GET /api/commissions', () => {
    it('should get all commission calculations', async () => {
      // Create a test commission calculation
      const calc = new CommissionCalculation({
        agent: testAgentId,
        transaction: new mongoose.Types.ObjectId(),
        baseAmount: 100000,
        rate: 5,
        finalAmount: 5000,
        status: 'pending'
      });
      await calc.save();
      
      const response = await request(app)
        .get('/api/commissions')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });
    
    it('should filter commissions by agent', async () => {
      // Create a test commission calculation
      const calc = new CommissionCalculation({
        agent: testAgentId,
        transaction: new mongoose.Types.ObjectId(),
        baseAmount: 100000,
        rate: 5,
        finalAmount: 5000,
        status: 'pending'
      });
      await calc.save();
      
      const response = await request(app)
        .get(`/api/commissions?agent=${testAgentId}`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0].agent).toHaveProperty('_id', testAgentId);
    });
  });
  
  describe('POST /api/commissions/:id/adjustments', () => {
    it('should apply adjustment to commission', async () => {
      // Create a test commission calculation
      const calc = new CommissionCalculation({
        agent: testAgentId,
        transaction: new mongoose.Types.ObjectId(),
        baseAmount: 100000,
        rate: 5,
        finalAmount: 5000,
        status: 'pending'
      });
      await calc.save();
      const calcId = calc._id ? calc._id.toString() : '';
      
      const response = await request(app)
        .post(`/api/commissions/${calcId}/adjustments`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          reason: 'Performance bonus',
          amount: 500
        });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('finalAmount', 5500);
      expect(response.body.data.adjustments.length).toBe(1);
    });
    
    it('should return 404 for non-existent commission', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      
      const response = await request(app)
        .post(`/api/commissions/${fakeId}/adjustments`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          reason: 'Performance bonus',
          amount: 500
        });
      
      expect(response.status).toBe(404);
    });
  });
}); 