import mongoose, { Types } from 'mongoose';
import Agent, { IAgent, AgentStatus } from '../models/Agent';
import { ApiError } from '../middleware/errorHandler';
import { loggerService } from '../utils/logger';
import CommissionStructure from '../models/CommissionStructure';
import bcrypt from 'bcryptjs';
import { NotFoundError, ValidationError, DatabaseError, ConflictError } from '../utils/errors';

/**
 * Agent service for handling agent-related business logic
 */
export class AgentService {
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
      loggerService.error('Error fetching agents:', { error });
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
      
      loggerService.error(`Error fetching agent ${id}:`, { error });
      throw new ApiError('Failed to fetch agent', 500);
    }
  }
  
  /**
   * Create new agent
   */
  async createAgent(agentData: {
    name: string;
    email: string;
    password: string;
    phone?: string;
    address?: string;
  }): Promise<any> {
    try {
      loggerService.info('Creating new agent', {
        email: agentData.email,
        name: agentData.name
      });

      // Check if email already exists
      const existingAgent = await Agent.findOne({ email: agentData.email });
      if (existingAgent) {
        throw new ConflictError('Email already registered');
      }

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(agentData.password, salt);

      // Create agent
      const agent = await Agent.create({
        ...agentData,
        password: hashedPassword
      });

      loggerService.info('Agent created successfully', {
        agentId: agent._id
      });

      return agent;
    } catch (error) {
      loggerService.error('Error creating agent', {
        error,
        email: agentData.email
      });

      if (error instanceof ConflictError) {
        throw error;
      }

      throw new DatabaseError('Failed to create agent');
    }
  }
  
  /**
   * Update agent
   */
  async updateAgent(
    id: string,
    updateData: {
      name?: string;
      email?: string;
      phone?: string;
      address?: string;
    }
  ): Promise<any> {
    try {
      loggerService.info('Updating agent', {
        id,
        updateData
      });

      const agent = await Agent.findByIdAndUpdate(
        id,
        { $set: updateData },
        { new: true }
      ).select('-password');

      if (!agent) {
        throw new NotFoundError(`Agent not found with id ${id}`);
      }

      loggerService.info('Agent updated successfully', {
        agentId: agent._id
      });

      return agent;
    } catch (error) {
      loggerService.error('Error updating agent', {
        error,
        id,
        updateData
      });

      if (error instanceof NotFoundError) {
        throw error;
      }

      throw new DatabaseError('Failed to update agent');
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
      
      loggerService.error(`Error updating agent status ${id}:`, { error });
      throw new ApiError('Failed to update agent status', 500);
    }
  }
  
  /**
   * Delete agent
   */
  async deleteAgent(id: string): Promise<void> {
    try {
      loggerService.info('Deleting agent', { id });

      const agent = await Agent.findByIdAndDelete(id);
      if (!agent) {
        throw new NotFoundError(`Agent not found with id ${id}`);
      }

      // Also delete associated commission structure
      await CommissionStructure.deleteOne({ agent: id });

      loggerService.info('Agent deleted successfully', {
        agentId: id
      });
    } catch (error) {
      loggerService.error('Error deleting agent', {
        error,
        id
      });

      if (error instanceof NotFoundError) {
        throw error;
      }

      throw new DatabaseError('Failed to delete agent');
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
      
      loggerService.error(`Error fetching team members for agent ${agentId}:`, { error });
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
      
      loggerService.error(`Error fetching supervisor chain for agent ${agentId}:`, { error });
      throw new ApiError('Failed to fetch supervisor chain', 500);
    }
  }

  /**
   * List agents with pagination
   */
  async listAgents(page: number = 1, limit: number = 10): Promise<any> {
    try {
      loggerService.info('Listing agents', {
        page,
        limit
      });

      const skip = (page - 1) * limit;
      const [agents, total] = await Promise.all([
        Agent.find()
          .select('-password')
          .skip(skip)
          .limit(limit)
          .sort({ createdAt: -1 }),
        Agent.countDocuments()
      ]);

      loggerService.debug('Found agents', {
        count: agents.length,
        total
      });

      return {
        agents,
        total,
        page,
        pages: Math.ceil(total / limit)
      };
    } catch (error) {
      loggerService.error('Error listing agents', {
        error,
        page,
        limit
      });
      throw new DatabaseError('Failed to list agents');
    }
  }

  /**
   * Authenticate agent
   */
  async authenticateAgent(email: string, password: string): Promise<any> {
    try {
      loggerService.info('Authenticating agent', { email });

      const agent = await Agent.findOne({ email });
      if (!agent) {
        throw new ValidationError('Invalid credentials');
      }

      const isMatch = await bcrypt.compare(password, agent.password);
      if (!isMatch) {
        throw new ValidationError('Invalid credentials');
      }

      loggerService.info('Agent authenticated successfully', {
        agentId: agent._id
      });

      return agent;
    } catch (error) {
      loggerService.error('Error authenticating agent', {
        error,
        email
      });

      if (error instanceof ValidationError) {
        throw error;
      }

      throw new DatabaseError('Failed to authenticate agent');
    }
  }
}

// Create and export a singleton instance of the service
const agentService = new AgentService();
export default agentService; 