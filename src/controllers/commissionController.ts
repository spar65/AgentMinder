import { Request, Response, NextFunction } from 'express';
import { validateRequest } from '../utils/validation';
import { commissionCalculationSchema } from '../utils/validationSchemas';
import CommissionCalculationService from '../services/CommissionCalculationService';

/**
 * Get all commission calculations with filtering and pagination
 * @route GET /api/commissions
 */
export const getCommissions = async (
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
    
    if (req.query.agent) {
      filter.agent = req.query.agent;
    }
    
    if (req.query.status) {
      filter.status = req.query.status;
    }

    // Use service to get commissions with pagination
    const { commissions, pagination } = await CommissionCalculationService.getAll(
      filter,
      sort,
      page,
      limit
    );
    
    res.status(200).json({
      success: true,
      count: commissions.length,
      pagination,
      data: commissions
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single commission calculation by ID
 * @route GET /api/commissions/:id
 */
export const getCommissionById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const commission = await CommissionCalculationService.getById(id);
    
    res.status(200).json({
      success: true,
      data: commission
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Calculate commission for a transaction
 * @route POST /api/commissions/calculate
 */
export const calculateCommission = [
  // Validate request body against schema
  validateRequest(commissionCalculationSchema.create),
  
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { agent, transaction, baseAmount, commissionStructure } = req.body;
      
      const commission = await CommissionCalculationService.calculateCommission(
        agent,
        transaction,
        baseAmount,
        commissionStructure
      );
      
      res.status(201).json({
        success: true,
        data: commission
      });
    } catch (error) {
      next(error);
    }
  }
];

/**
 * Apply an adjustment to a commission calculation
 * @route POST /api/commissions/:id/adjustments
 */
export const applyAdjustment = [
  // Validate request body against schema
  validateRequest(commissionCalculationSchema.addAdjustment),
  
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const { reason, amount, description } = req.body;
      
      const commission = await CommissionCalculationService.applyAdjustment(
        id,
        reason,
        amount,
        description
      );
      
      res.status(200).json({
        success: true,
        data: commission
      });
    } catch (error) {
      next(error);
    }
  }
];

/**
 * Approve a commission calculation
 * @route PATCH /api/commissions/:id/approve
 */
export const approveCommission = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    // In a real system, the approvedBy would come from the authenticated user
    // For now, we'll use a hardcoded value
    const approvedById = "60d21b4667d0d8992e610c85"; // Replace with JWT token user ID
    
    const commission = await CommissionCalculationService.approveCommission(
      id,
      approvedById
    );
    
    res.status(200).json({
      success: true,
      data: commission
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Mark a commission calculation as paid with a transaction
 * @route PATCH /api/commissions/:id/pay
 */
export const markAsPaid = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { transactionId } = req.body;
    
    if (!transactionId) {
      res.status(400).json({
        success: false,
        message: 'Transaction ID is required'
      });
      return;
    }
    
    const commission = await CommissionCalculationService.markAsPaid(
      id,
      transactionId
    );
    
    res.status(200).json({
      success: true,
      data: commission
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get agent commission statistics
 * @route GET /api/commissions/agent/:agentId/stats
 */
export const getAgentCommissionStats = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { agentId } = req.params;
    let startDate: Date | undefined;
    let endDate: Date | undefined;
    
    if (req.query.startDate) {
      startDate = new Date(req.query.startDate as string);
    }
    
    if (req.query.endDate) {
      endDate = new Date(req.query.endDate as string);
    }
    
    const stats = await CommissionCalculationService.getAgentCommissionStats(
      agentId,
      startDate,
      endDate
    );
    
    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
}; 