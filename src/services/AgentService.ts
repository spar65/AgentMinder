import mongoose from 'mongoose';
import Agent, { IAgent, AgentStatus } from '../models/Agent';
import { ApiError } from '../middleware/errorHandler';
import { createLogger } from '../utils/logger';

const logger = createLogger();

/**
 * Agent service for handling agent-related business logic
 */
class AgentService {
  /**
   * Get all agents with filtering, sorting, and pagination
   */
  async getAgents(
    filter: Record<string, unknown> = {},
    sort: string = '-createdAt',
    page: number = 1,
    limit: number = 10
  ): Promise<{
    agents: IAgent[];
    pagination: {
      current: number;
      limit: number;
      total: number;
      totalRecords: number;
    };
  }> {
    const skip = (page - 1) * limit;
    
    // Build search filter if needed
    if (filter.search) {
      filter.$text = { $search: filter.search as string };
      delete filter.search;
    }
    
    try {
      // Execute query with pagination
      const agents = await Agent.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit);
      
      // Get total count for pagination metadata
      const totalAgents = await Agent.countDocuments(filter);
      
      return {
        agents,
        pagination: {
          current: page,
          limit,
          total: Math.ceil(totalAgents / limit),
          totalRecords: totalAgents
        }
      };
    } catch (error) {
      logger.error('Error fetching agents:', { error });
      throw new ApiError('Failed to fetch agents', 500);
    }
  }
  
  /**
   * Get single agent by ID
   */
  async getAgentById(id: string): Promise<IAgent> {
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ApiError('Invalid agent ID', 400);
    }
    
    try {
      const agent = await Agent.findById(id);
      
      if (!agent) {
        throw new ApiError('Agent not found', 404);
      }
      
      return agent;
    } catch (error) {
      // Rethrow ApiError instances
      if (error instanceof ApiError) {
        throw error;
      }
      
      logger.error(`Error fetching agent ${id}:`, { error });
      throw new ApiError('Failed to fetch agent', 500);
    }
  }
  
  /**
   * Create new agent
   */
  async createAgent(agentData: Partial<IAgent>): Promise<IAgent> {
    try {
      // Create new agent
      const agent = await Agent.create(agentData);
      
      logger.info(`New agent created: ${agent._id}`);
      
      return agent;
    } catch (error) {
      // Handle validation and duplicate errors
      if (error instanceof mongoose.Error.ValidationError) {
        const messages = Object.values(error.errors).map(err => err.message);
        throw new ApiError(messages.join(', '), 400);
      } else if ((error as any).code === 11000) {
        throw new ApiError('Email already exists', 400);
      }
      
      logger.error('Error creating agent:', { error });
      throw new ApiError('Failed to create agent', 500);
    }
  }
  
  /**
   * Update agent
   */
  async updateAgent(id: string, updateData: Partial<IAgent>): Promise<IAgent> {
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ApiError('Invalid agent ID', 400);
    }
    
    try {
      // Find and update agent
      const agent = await Agent.findByIdAndUpdate(id, updateData, {
        new: true,
        runValidators: true
      });
      
      if (!agent) {
        throw new ApiError('Agent not found', 404);
      }
      
      logger.info(`Agent updated: ${id}`);
      
      return agent;
    } catch (error) {
      // Handle validation errors
      if (error instanceof mongoose.Error.ValidationError) {
        const messages = Object.values(error.errors).map(err => err.message);
        throw new ApiError(messages.join(', '), 400);
      } else if (error instanceof ApiError) {
        throw error;
      }
      
      logger.error(`Error updating agent ${id}:`, { error });
      throw new ApiError('Failed to update agent', 500);
    }
  }
  
  /**
   * Update agent status
   */
  async updateAgentStatus(id: string, status: AgentStatus, reason?: string): Promise<IAgent> {
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ApiError('Invalid agent ID', 400);
    }
    
    // Validate status
    if (!Object.values(AgentStatus).includes(status)) {
      throw new ApiError('Invalid status value', 400);
    }
    
    try {
      // Get the agent
      const agent = await this.getAgentById(id);
      
      // Use the agent's updateStatus method
      await agent.updateStatus(status, reason);
      
      // Return the updated agent
      return await this.getAgentById(id);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      
      logger.error(`Error updating agent status ${id}:`, { error });
      throw new ApiError('Failed to update agent status', 500);
    }
  }
  
  /**
   * Delete agent
   */
  async deleteAgent(id: string): Promise<void> {
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ApiError('Invalid agent ID', 400);
    }
    
    try {
      // Find and delete agent
      const agent = await Agent.findByIdAndDelete(id);
      
      if (!agent) {
        throw new ApiError('Agent not found', 404);
      }
      
      logger.info(`Agent deleted: ${id}`);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      
      logger.error(`Error deleting agent ${id}:`, { error });
      throw new ApiError('Failed to delete agent', 500);
    }
  }
  
  /**
   * Get agent team members
   */
  async getTeamMembers(agentId: string): Promise<IAgent[]> {
    try {
      const agent = await this.getAgentById(agentId);
      return await agent.getTeamMembers();
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      
      logger.error(`Error fetching team members for agent ${agentId}:`, { error });
      throw new ApiError('Failed to fetch team members', 500);
    }
  }
  
  /**
   * Get agent supervisor chain
   */
  async getSupervisorChain(agentId: string): Promise<IAgent[]> {
    try {
      const agent = await this.getAgentById(agentId);
      return await agent.getSupervisorChain();
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      
      logger.error(`Error fetching supervisor chain for agent ${agentId}:`, { error });
      throw new ApiError('Failed to fetch supervisor chain', 500);
    }
  }
}

export default new AgentService(); 