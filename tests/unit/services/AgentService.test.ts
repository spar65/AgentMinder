import mongoose from 'mongoose';
import AgentService from '../../../src/services/AgentService';
import Agent, { AgentStatus } from '../../../src/models/Agent';
import { ApiError } from '../../../src/middleware/errorHandler';

// Mock dependencies
jest.mock('../../../src/models/Agent');

describe('AgentService Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAgentById', () => {
    it('should return an agent when valid ID is provided', async () => {
      const mockAgent = {
        _id: 'validAgentId',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        status: AgentStatus.ACTIVE
      };
      
      // Mock mongoose.Types.ObjectId.isValid
      jest.spyOn(mongoose.Types.ObjectId, 'isValid').mockReturnValue(true);
      
      // Mock Agent.findById
      (Agent.findById as jest.Mock).mockResolvedValue(mockAgent);
      
      const result = await AgentService.getAgentById('validAgentId');
      
      expect(result).toEqual(mockAgent);
      expect(Agent.findById).toHaveBeenCalledWith('validAgentId');
    });
    
    it('should throw error for invalid agent ID format', async () => {
      // Mock mongoose.Types.ObjectId.isValid to return false
      jest.spyOn(mongoose.Types.ObjectId, 'isValid').mockReturnValue(false);
      
      await expect(
        AgentService.getAgentById('invalidAgentId')
      ).rejects.toThrow('Invalid agent ID');
    });
    
    it('should throw error when agent not found', async () => {
      // Mock mongoose.Types.ObjectId.isValid
      jest.spyOn(mongoose.Types.ObjectId, 'isValid').mockReturnValue(true);
      
      // Mock Agent.findById to return null
      (Agent.findById as jest.Mock).mockResolvedValue(null);
      
      await expect(
        AgentService.getAgentById('nonExistentAgentId')
      ).rejects.toThrow('Agent not found');
    });
  });
}); 