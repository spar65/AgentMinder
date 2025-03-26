import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../middleware/errorHandler';
import AgentService from '../services/AgentService';
import { agentSchema } from '../utils/validationSchemas';
import { validateRequest } from '../utils/validation';

/**
 * Get all agents with filtering, sorting, and pagination
 * @route GET /api/agents
 */
export const getAgents = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Parse query parameters
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const sort = (req.query.sort as string) || '-createdAt';
    
    // Build filter object
    const filter: Record<string, unknown> = {};
    
    if (req.query.status) {
      filter.status = req.query.status;
    }
    
    if (req.query.search) {
      filter.search = req.query.search;
    }

    // Use service to get agents with pagination
    const { agents, pagination } = await AgentService.getAgents(
      filter,
      sort,
      page,
      limit
    );
    
    res.status(200).json({
      success: true,
      count: agents.length,
      pagination,
      data: agents
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single agent by ID
 * @route GET /api/agents/:id
 */
export const getAgentById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const agent = await AgentService.getAgentById(id);
    
    res.status(200).json({
      success: true,
      data: agent
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create new agent
 * @route POST /api/agents
 */
export const createAgent = [
  // Validate request body against schema
  validateRequest(agentSchema.create),
  
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const agent = await AgentService.createAgent(req.body);
      
      res.status(201).json({
        success: true,
        data: agent
      });
    } catch (error) {
      next(error);
    }
  }
];

/**
 * Update agent
 * @route PUT /api/agents/:id
 */
export const updateAgent = [
  // Validate request body against schema
  validateRequest(agentSchema.update),
  
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const agent = await AgentService.updateAgent(id, req.body);
      
      res.status(200).json({
        success: true,
        data: agent
      });
    } catch (error) {
      next(error);
    }
  }
];

/**
 * Update agent status
 * @route PATCH /api/agents/:id/status
 */
export const updateAgentStatus = [
  // Validate request body against schema
  validateRequest(agentSchema.updateStatus),
  
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const { status, reason } = req.body;
      
      const agent = await AgentService.updateAgentStatus(id, status, reason);
      
      res.status(200).json({
        success: true,
        data: agent
      });
    } catch (error) {
      next(error);
    }
  }
];

/**
 * Delete agent
 * @route DELETE /api/agents/:id
 */
export const deleteAgent = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    await AgentService.deleteAgent(id);
    
    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get agent team members
 * @route GET /api/agents/:id/team
 */
export const getAgentTeam = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const teamMembers = await AgentService.getTeamMembers(id);
    
    res.status(200).json({
      success: true,
      count: teamMembers.length,
      data: teamMembers
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get agent supervisor chain
 * @route GET /api/agents/:id/supervisors
 */
export const getAgentSupervisors = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const supervisors = await AgentService.getSupervisorChain(id);
    
    res.status(200).json({
      success: true,
      count: supervisors.length,
      data: supervisors
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get agent payments
 * @route GET /api/agents/:id/payments
 */
export const getAgentPayments = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    
    // Validate agent exists
    await AgentService.getAgentById(id);
    
    // The payments functionality will be moved to the TransactionService
    // This is a placeholder until we implement the TransactionService
    res.status(200).json({
      success: true,
      message: 'This endpoint will be implemented with the TransactionService'
    });
  } catch (error) {
    next(error);
  }
}; 