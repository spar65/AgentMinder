import mongoose, { Types } from 'mongoose';
import { ApiError } from '../middleware/errorHandler';
import { createLogger } from '../utils/logger';
import CommissionCalculation, { ICommissionCalculation, CommissionStatus } from '../models/CommissionCalculation';
import CommissionStructure from '../models/CommissionStructure';
import agentService from './AgentService';
import Agent from '../models/Agent';
import { loggerService } from '../utils/logger';
import { NotFoundError, ValidationError, DatabaseError } from '../utils/errors';

const logger = createLogger();

/**
 * Commission calculation service for handling commission-related business logic
 */
class CommissionCalculationService {
  /**
   * Calculate and create a commission calculation for a transaction
   */
  async calculateCommission(
    agentId: string,
    transactionId: string,
    baseAmount: number,
    commissionStructureId?: string
  ): Promise<ICommissionCalculation> {
    try {
      loggerService.info('Starting commission calculation', {
        agentId,
        transactionId,
        baseAmount
      });

      // Validate agent
      const agent = await agentService.getAgentById(agentId);
      
      // If a commission structure ID is provided, use that
      if (commissionStructureId) {
        return await this.calculateWithStructure(
          agent,
          transactionId,
          baseAmount,
          commissionStructureId
        );
      }
      
      // Try to find a default structure
      const defaultStructure = await CommissionStructure.findOne({
        $and: [
          {
            $or: [
              { agent: agentId, isDefault: true },
              { agent: null, isDefault: true }
            ]
          },
          {
            $or: [
              { expirationDate: { $exists: false } },
              { expirationDate: null },
              { expirationDate: { $gt: new Date() } }
            ]
          }
        ]
      }).sort({ effectiveDate: -1 });
      
      // If we found a default structure, use it
      if (defaultStructure) {
        return await this.calculateWithStructure(
          agent,
          transactionId,
          baseAmount,
          defaultStructure._id ? defaultStructure._id.toString() : ''
        );
      }
      
      // Otherwise, use the agent's base rate
      return await this.calculateWithBaseRate(agent, transactionId, baseAmount);
    } catch (error) {
      loggerService.error('Error calculating commission', {
        error,
        agentId,
        transactionId,
        baseAmount
      });

      if (error instanceof ApiError) {
        throw error;
      }
      
      throw new DatabaseError('Failed to calculate commission');
    }
  }
  
  /**
   * Helper method to calculate commission with a structure
   */
  private async calculateWithStructure(
    agent: any,
    transactionId: string,
    baseAmount: number,
    commissionStructureId: string
  ): Promise<ICommissionCalculation> {
    // Validate structure ID
    if (!mongoose.Types.ObjectId.isValid(commissionStructureId)) {
      throw new ApiError('Invalid commission structure ID', 400);
    }
    
    // Get the structure
    const commissionStructure = await CommissionStructure.findById(commissionStructureId);
    
    if (!commissionStructure) {
      throw new ApiError('Commission structure not found', 404);
    }
    
    // Verify the structure is valid for this agent
    if (commissionStructure.agent && 
        commissionStructure.agent.toString() !== agent._id.toString() &&
        !commissionStructure.isDefault) {
      throw new ApiError('Commission structure not valid for this agent', 400);
    }
    
    // Calculate commission rate based on structure
    let commissionRate = commissionStructure.baseRate;
    
    // Apply tiered rates if applicable
    if (commissionStructure.tiers && commissionStructure.tiers.length > 0) {
      // Find the highest tier that applies to this sales amount
      const applicableTier = [...commissionStructure.tiers]
        .sort((a, b) => b.min - a.min)
        .find(tier => baseAmount >= tier.min);
      
      if (applicableTier) {
        commissionRate = applicableTier.rate;
      }
    }
    
    // Calculate commission amount
    const finalAmount = (baseAmount * commissionRate) / 100;
    
    // Create commission calculation record
    try {
      const commissionCalculation = await CommissionCalculation.create({
        agent: agent._id,
        transaction: transactionId,
        commissionStructure: commissionStructure._id,
        baseAmount,
        rate: commissionRate,
        finalAmount,
        status: CommissionStatus.PENDING
      });
      
      loggerService.info('Commission calculation completed', {
        calculationId: commissionCalculation._id,
        finalAmount
      });
      
      return commissionCalculation;
    } catch (error) {
      loggerService.error('Error creating commission calculation with structure:', { error });
      throw new ApiError('Failed to create commission calculation', 500);
    }
  }
  
  /**
   * Helper method to calculate commission with agent base rate
   */
  private async calculateWithBaseRate(
    agent: any,
    transactionId: string,
    baseAmount: number
  ): Promise<ICommissionCalculation> {
    const rate = agent.commissionRate;
    const finalAmount = (baseAmount * rate) / 100;
    
    try {
      // Create a commission calculation record with the base rate
      const commissionCalculation = await CommissionCalculation.create({
        agent: agent._id,
        transaction: transactionId,
        baseAmount,
        rate,
        finalAmount,
        status: CommissionStatus.PENDING
      });
      
      loggerService.info('Commission calculation completed', {
        calculationId: commissionCalculation._id,
        finalAmount
      });
      
      return commissionCalculation;
    } catch (error) {
      loggerService.error('Error creating commission calculation with base rate:', { error });
      throw new ApiError('Failed to create commission calculation', 500);
    }
  }
  
  /**
   * Get commission calculation by ID
   */
  async getById(id: string): Promise<ICommissionCalculation> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ValidationError('Invalid commission calculation ID');
    }
    
    try {
      const commissionCalculation = await CommissionCalculation.findById(id)
        .populate('agent', 'firstName lastName email')
        .populate('commissionStructure', 'name baseRate');
      
      if (!commissionCalculation) {
        throw new NotFoundError('Commission calculation not found');
      }
      
      return commissionCalculation;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      
      loggerService.error(`Error fetching commission calculation ${id}:`, { error });
      throw new DatabaseError('Failed to fetch commission calculation');
    }
  }
  
  /**
   * Get all commission calculations with filtering and pagination
   */
  async getAll(
    filter: Record<string, unknown> = {},
    sort: string = '-createdAt',
    page: number = 1,
    limit: number = 10
  ): Promise<{
    commissions: ICommissionCalculation[];
    pagination: {
      current: number;
      limit: number;
      total: number;
      totalRecords: number;
    };
  }> {
    const skip = (page - 1) * limit;
    
    try {
      // Execute query with pagination
      const commissions = await CommissionCalculation.find(filter)
        .populate('agent', 'firstName lastName email')
        .populate('commissionStructure', 'name baseRate')
        .sort(sort)
        .skip(skip)
        .limit(limit);
      
      // Get total count for pagination metadata
      const totalCommissions = await CommissionCalculation.countDocuments(filter);
      
      return {
        commissions,
        pagination: {
          current: page,
          limit,
          total: Math.ceil(totalCommissions / limit),
          totalRecords: totalCommissions
        }
      };
    } catch (error) {
      loggerService.error('Error fetching commission calculations:', { error });
      throw new ApiError('Failed to fetch commission calculations', 500);
    }
  }
  
  /**
   * Apply an adjustment to a commission calculation
   */
  async applyAdjustment(
    id: string,
    reason: string,
    amount: number,
    description?: string
  ): Promise<ICommissionCalculation> {
    try {
      const commissionCalculation = await this.getById(id);
      
      // Check if the commission is in a state where adjustments can be applied
      if (commissionCalculation.status === CommissionStatus.PAID) {
        throw new ValidationError('Cannot adjust a paid commission');
      }
      
      // Apply the adjustment
      await commissionCalculation.applyAdjustment(reason, amount, undefined, description);
      
      // Get the updated record
      return await this.getById(id);
    } catch (error) {
      // Rethrow NotFoundError and ValidationError
      if (error instanceof NotFoundError || error instanceof ValidationError) {
        loggerService.error(`Error applying adjustment to commission ${id}:`, { error });
        throw error;
      }
      
      loggerService.error(`Error applying adjustment to commission ${id}:`, { error });
      throw new DatabaseError('Failed to apply commission adjustment');
    }
  }
  
  /**
   * Approve a commission calculation
   */
  async approveCommission(id: string, approvedById: string): Promise<ICommissionCalculation> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ApiError('Invalid commission calculation ID', 400);
    }
    
    if (!mongoose.Types.ObjectId.isValid(approvedById)) {
      throw new ApiError('Invalid approver ID', 400);
    }
    
    try {
      const commissionCalculation = await this.getById(id);
      
      // Approve the commission
      await commissionCalculation.approve(new mongoose.Types.ObjectId(approvedById));
      
      // Get the updated record
      return await this.getById(id);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      
      loggerService.error(`Error approving commission ${id}:`, { error });
      throw new ApiError('Failed to approve commission', 500);
    }
  }
  
  /**
   * Mark a commission calculation as paid
   */
  async markAsPaid(id: string, transactionId: string): Promise<ICommissionCalculation> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ApiError('Invalid commission calculation ID', 400);
    }
    
    if (!mongoose.Types.ObjectId.isValid(transactionId)) {
      throw new ApiError('Invalid transaction ID', 400);
    }
    
    try {
      const commissionCalculation = await this.getById(id);
      
      // Mark the commission as paid
      await commissionCalculation.markAsPaid(new mongoose.Types.ObjectId(transactionId));
      
      // Get the updated record
      return await this.getById(id);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      
      loggerService.error(`Error marking commission ${id} as paid:`, { error });
      throw new ApiError('Failed to mark commission as paid', 500);
    }
  }
  
  /**
   * Get agent's commission statistics
   */
  async getAgentCommissionStats(
    agentId: string, 
    startDate?: Date, 
    endDate?: Date
  ): Promise<Record<string, any>> {
    if (!mongoose.Types.ObjectId.isValid(agentId)) {
      throw new ApiError('Invalid agent ID', 400);
    }
    
    try {
      // Validate agent exists
      await agentService.getAgentById(agentId);
      
      // Get commission statistics
      const stats = await CommissionCalculation.getAgentCommissionStats(
        new mongoose.Types.ObjectId(agentId),
        startDate,
        endDate
      );
      
      return stats;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      
      loggerService.error(`Error getting commission stats for agent ${agentId}:`, { error });
      throw new ApiError('Failed to get commission statistics', 500);
    }
  }
}

export default new CommissionCalculationService(); 