import mongoose from 'mongoose';
import { ApiError } from '../middleware/errorHandler';
import { createLogger } from '../utils/logger';
import CommissionCalculation, { ICommissionCalculation, CommissionStatus } from '../models/CommissionCalculation';
import CommissionStructure from '../models/CommissionStructure';
import AgentService from './AgentService';

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
      // Validate agent
      const agent = await AgentService.getAgentById(agentId);
      
      // Get the commission structure - either specified or default for the agent
      let commissionStructure;
      if (commissionStructureId) {
        // Use specified commission structure
        if (!mongoose.Types.ObjectId.isValid(commissionStructureId)) {
          throw new ApiError('Invalid commission structure ID', 400);
        }
        
        commissionStructure = await CommissionStructure.findById(commissionStructureId);
        
        if (!commissionStructure) {
          throw new ApiError('Commission structure not found', 404);
        }
        
        // Verify the structure is valid for this agent
        if (commissionStructure.agent && 
            commissionStructure.agent.toString() !== agentId &&
            !commissionStructure.isDefault) {
          throw new ApiError('Commission structure not valid for this agent', 400);
        }
      } else {
        // Find default structure for the agent
        commissionStructure = await CommissionStructure.findOne({
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
        
        if (!commissionStructure) {
          // Use agent's base commission rate if no structure found
          const rate = agent.commissionRate;
          
          // Create a commission calculation record with the base rate
          const commissionCalculation = await CommissionCalculation.create({
            agent: agentId,
            transaction: transactionId,
            baseAmount,
            rate,
            finalAmount: (baseAmount * rate) / 100,
            status: CommissionStatus.PENDING
          });
          
          logger.info(`Commission calculation created with base rate: ${commissionCalculation._id}`);
          
          return commissionCalculation;
        }
      }
      
      // Calculate commission using the commission structure
      let commissionRate = commissionStructure.baseRate;
      
      // Apply tiered rates if applicable
      if (commissionStructure.tiers && commissionStructure.tiers.length > 0) {
        // Find the highest tier that applies to this sales amount
        const applicableTier = [...commissionStructure.tiers]
          .sort((a, b) => b.threshold - a.threshold)
          .find(tier => baseAmount >= tier.threshold);
        
        if (applicableTier) {
          commissionRate = applicableTier.rate;
        }
      }
      
      // Calculate commission amount
      const finalAmount = (baseAmount * commissionRate) / 100;
      
      // Create commission calculation record
      const commissionCalculation = await CommissionCalculation.create({
        agent: agentId,
        transaction: transactionId,
        commissionStructure: commissionStructure._id,
        baseAmount,
        rate: commissionRate,
        finalAmount,
        status: CommissionStatus.PENDING
      });
      
      logger.info(`Commission calculation created: ${commissionCalculation._id}`);
      
      return commissionCalculation;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      
      logger.error('Error calculating commission:', { error });
      throw new ApiError('Failed to calculate commission', 500);
    }
  }
  
  /**
   * Get commission calculation by ID
   */
  async getById(id: string): Promise<ICommissionCalculation> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ApiError('Invalid commission calculation ID', 400);
    }
    
    try {
      const commissionCalculation = await CommissionCalculation.findById(id)
        .populate('agent', 'firstName lastName email')
        .populate('commissionStructure', 'name baseRate');
      
      if (!commissionCalculation) {
        throw new ApiError('Commission calculation not found', 404);
      }
      
      return commissionCalculation;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      
      logger.error(`Error fetching commission calculation ${id}:`, { error });
      throw new ApiError('Failed to fetch commission calculation', 500);
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
      logger.error('Error fetching commission calculations:', { error });
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
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ApiError('Invalid commission calculation ID', 400);
    }
    
    try {
      const commissionCalculation = await this.getById(id);
      
      // Check if the commission is in a state where adjustments can be applied
      if (commissionCalculation.status === CommissionStatus.PAID) {
        throw new ApiError('Cannot adjust a paid commission', 400);
      }
      
      // Apply the adjustment
      await commissionCalculation.applyAdjustment(reason, amount, undefined, description);
      
      // Get the updated record
      return await this.getById(id);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      
      logger.error(`Error applying adjustment to commission ${id}:`, { error });
      throw new ApiError('Failed to apply commission adjustment', 500);
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
      
      logger.error(`Error approving commission ${id}:`, { error });
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
      
      logger.error(`Error marking commission ${id} as paid:`, { error });
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
      await AgentService.getAgentById(agentId);
      
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
      
      logger.error(`Error getting commission stats for agent ${agentId}:`, { error });
      throw new ApiError('Failed to get commission statistics', 500);
    }
  }
}

export default new CommissionCalculationService(); 