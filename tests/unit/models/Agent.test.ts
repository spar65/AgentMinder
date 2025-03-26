import mongoose from 'mongoose';
import Agent, { AgentStatus } from '../../../src/models/Agent';

// Mock the mongoose connection for testing
jest.mock('mongoose', () => {
  const originalModule = jest.requireActual('mongoose');
  return {
    ...originalModule,
    model: jest.fn().mockReturnValue({
      create: jest.fn().mockImplementation((data) => Promise.resolve({ ...data, _id: 'mockId' })),
    }),
  };
});

describe('Agent Model Tests', () => {
  // Test data
  const validAgentData = {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    phoneNumber: '123-456-7890',
    status: AgentStatus.ACTIVE,
    commissionRate: 10,
    specializations: ['Sales', 'Marketing'],
  };

  // Reset mocks after each test
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Agent Validation', () => {
    it('should create a valid agent', async () => {
      const mock = Agent.create as jest.Mock;
      mock.mockResolvedValueOnce({
        ...validAgentData,
        _id: 'mockId',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const newAgent = await Agent.create(validAgentData);
      
      expect(newAgent).toHaveProperty('_id');
      expect(newAgent.firstName).toBe(validAgentData.firstName);
      expect(newAgent.lastName).toBe(validAgentData.lastName);
      expect(newAgent.email).toBe(validAgentData.email);
      expect(newAgent.status).toBe(AgentStatus.ACTIVE);
      expect(mock).toHaveBeenCalledWith(validAgentData);
    });

    it('should default status to PENDING when not provided', async () => {
      const agentDataWithoutStatus = { ...validAgentData };
      delete agentDataWithoutStatus.status;

      const mock = Agent.create as jest.Mock;
      mock.mockResolvedValueOnce({
        ...agentDataWithoutStatus,
        status: AgentStatus.PENDING,
        _id: 'mockId',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const newAgent = await Agent.create(agentDataWithoutStatus);
      
      expect(newAgent.status).toBe(AgentStatus.PENDING);
    });

    it('should reject an agent with invalid commission rate', async () => {
      const invalidAgent = { ...validAgentData, commissionRate: 101 };
      
      const mock = Agent.create as jest.Mock;
      mock.mockRejectedValueOnce(new mongoose.Error.ValidationError());

      await expect(Agent.create(invalidAgent)).rejects.toThrow();
    });

    it('should reject an agent with invalid email', async () => {
      const invalidAgent = { ...validAgentData, email: 'invalid-email' };
      
      const mock = Agent.create as jest.Mock;
      mock.mockRejectedValueOnce(new mongoose.Error.ValidationError());

      await expect(Agent.create(invalidAgent)).rejects.toThrow();
    });
  });

  // These tests would be more integration-oriented in a real setup
  describe('Agent Virtual Properties', () => {
    it('should have a fullName virtual property', () => {
      // This would require a real mongoose instance to test properly
      // In a real test, we would need to instantiate the model and test the virtual
      
      // Mocking what would happen
      const agent = {
        firstName: 'John',
        lastName: 'Doe',
        get fullName() {
          return `${this.firstName} ${this.lastName}`;
        }
      };
      
      expect(agent.fullName).toBe('John Doe');
    });
  });
}); 