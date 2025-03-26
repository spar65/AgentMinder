import mongoose from 'mongoose';
import { ApiError } from '../../../src/middleware/errorHandler';
import CommissionCalculationService from '../../../src/services/CommissionCalculationService';
import CommissionCalculation, { CommissionStatus } from '../../../src/models/CommissionCalculation';
import CommissionStructure from '../../../src/models/CommissionStructure';
import AgentService from '../../../src/services/AgentService';

// Mock dependencies
jest.mock('../../../src/models/CommissionCalculation');
jest.mock('../../../src/models/CommissionStructure');
jest.mock('../../../src/services/AgentService');

describe('CommissionCalculationService Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateCommission', () => {
    const mockAgentId = 'mockAgentId';
    const mockTransactionId = 'mockTransactionId';
    const mockCommissionStructureId = 'mockCommissionStructureId';
    const baseAmount = 100000;
    
    it('should calculate commission using agent base rate when no structure provided', async () => {
      // Mock agent service to return an agent with base commission rate
      (AgentService.getAgentById as jest.Mock).mockResolvedValue({
        _id: mockAgentId,
        commissionRate: 5,
      });
      
      // Mock CommissionStructure.findOne to return null (no default structure)
      (CommissionStructure.findOne as jest.Mock).mockResolvedValue(null);
      
      // Mock CommissionCalculation.create
      (CommissionCalculation.create as jest.Mock).mockResolvedValue({
        _id: 'mockCommissionId',
        agent: mockAgentId,
        transaction: mockTransactionId,
        baseAmount,
        rate: 5,
        finalAmount: 5000, // 5% of 100000
        status: CommissionStatus.PENDING
      });
      
      const result = await CommissionCalculationService.calculateCommission(
        mockAgentId,
        mockTransactionId,
        baseAmount
      );
      
      expect(result).toHaveProperty('_id', 'mockCommissionId');
      expect(result.rate).toBe(5);
      expect(result.finalAmount).toBe(5000);
      expect(CommissionCalculation.create).toHaveBeenCalledWith({
        agent: mockAgentId,
        transaction: mockTransactionId,
        baseAmount,
        rate: 5,
        finalAmount: 5000,
        status: CommissionStatus.PENDING
      });
    });
    
    it('should calculate commission using specified commission structure', async () => {
      // Mock agent service
      (AgentService.getAgentById as jest.Mock).mockResolvedValue({
        _id: mockAgentId,
        commissionRate: 3,
      });
      
      // Mock CommissionStructure.findById
      (CommissionStructure.findById as jest.Mock).mockResolvedValue({
        _id: mockCommissionStructureId,
        agent: mockAgentId,
        baseRate: 6,
        tiers: [],
        isDefault: false,
      });
      
      // Mock mongoose.Types.ObjectId.isValid
      jest.spyOn(mongoose.Types.ObjectId, 'isValid').mockReturnValue(true);
      
      // Mock CommissionCalculation.create
      (CommissionCalculation.create as jest.Mock).mockResolvedValue({
        _id: 'mockCommissionId',
        agent: mockAgentId,
        transaction: mockTransactionId,
        commissionStructure: mockCommissionStructureId,
        baseAmount,
        rate: 6,
        finalAmount: 6000, // 6% of 100000
        status: CommissionStatus.PENDING
      });
      
      const result = await CommissionCalculationService.calculateCommission(
        mockAgentId,
        mockTransactionId,
        baseAmount,
        mockCommissionStructureId
      );
      
      expect(result).toHaveProperty('_id', 'mockCommissionId');
      expect(result.rate).toBe(6);
      expect(result.finalAmount).toBe(6000);
      expect(result.commissionStructure).toBe(mockCommissionStructureId);
    });
    
    it('should calculate commission using tiered rates', async () => {
      // Mock agent service
      (AgentService.getAgentById as jest.Mock).mockResolvedValue({
        _id: mockAgentId,
        commissionRate: 3,
      });
      
      // Mock CommissionStructure.findById
      (CommissionStructure.findById as jest.Mock).mockResolvedValue({
        _id: mockCommissionStructureId,
        agent: mockAgentId,
        baseRate: 5,
        tiers: [
          { threshold: 50000, rate: 6 },
          { threshold: 100000, rate: 7 },
          { threshold: 200000, rate: 8 }
        ],
        isDefault: false,
      });
      
      // Mock mongoose.Types.ObjectId.isValid
      jest.spyOn(mongoose.Types.ObjectId, 'isValid').mockReturnValue(true);
      
      // Mock CommissionCalculation.create
      (CommissionCalculation.create as jest.Mock).mockResolvedValue({
        _id: 'mockCommissionId',
        agent: mockAgentId,
        transaction: mockTransactionId,
        commissionStructure: mockCommissionStructureId,
        baseAmount: 150000,
        rate: 7,
        finalAmount: 10500, // 7% of 150000
        status: CommissionStatus.PENDING
      });
      
      const result = await CommissionCalculationService.calculateCommission(
        mockAgentId,
        mockTransactionId,
        150000,
        mockCommissionStructureId
      );
      
      expect(result).toHaveProperty('_id', 'mockCommissionId');
      expect(result.rate).toBe(7);
      expect(result.finalAmount).toBe(10500);
    });
    
    it('should throw error for invalid agent ID', async () => {
      // Mock AgentService to throw error
      (AgentService.getAgentById as jest.Mock).mockRejectedValue(
        new ApiError('Agent not found', 404)
      );
      
      await expect(
        CommissionCalculationService.calculateCommission(
          'invalidAgentId',
          mockTransactionId,
          baseAmount
        )
      ).rejects.toThrow('Agent not found');
    });
  });
  
  describe('getById', () => {
    it('should return commission calculation by ID', async () => {
      const mockId = 'validCommissionId';
      
      // Mock mongoose.Types.ObjectId.isValid
      jest.spyOn(mongoose.Types.ObjectId, 'isValid').mockReturnValue(true);
      
      // Mock CommissionCalculation.findById
      const mockPopulate = jest.fn().mockReturnThis();
      const mockPopulateFinal = jest.fn().mockResolvedValue({
        _id: mockId,
        agent: { _id: 'agentId', firstName: 'John', lastName: 'Doe' },
        baseAmount: 100000,
        rate: 5,
        finalAmount: 5000,
      });
      
      (CommissionCalculation.findById as jest.Mock).mockReturnValue({
        populate: mockPopulate,
      });
      mockPopulate.mockReturnValue({
        populate: mockPopulateFinal,
      });
      
      const result = await CommissionCalculationService.getById(mockId);
      
      expect(result).toHaveProperty('_id', mockId);
      expect(CommissionCalculation.findById).toHaveBeenCalledWith(mockId);
    });
    
    it('should throw error for invalid ID format', async () => {
      // Mock mongoose.Types.ObjectId.isValid
      jest.spyOn(mongoose.Types.ObjectId, 'isValid').mockReturnValue(false);
      
      await expect(
        CommissionCalculationService.getById('invalidId')
      ).rejects.toThrow('Invalid commission calculation ID');
    });
  });
  
  describe('applyAdjustment', () => {
    it('should apply adjustment to commission calculation', async () => {
      const mockId = 'validCommissionId';
      const mockReason = 'Performance bonus';
      const mockAmount = 500;
      
      // Mock getById to return a commission with a mocked applyAdjustment method
      const mockCommission = {
        _id: mockId,
        status: CommissionStatus.PENDING,
        applyAdjustment: jest.fn().mockResolvedValue(true),
      };
      
      jest.spyOn(CommissionCalculationService, 'getById')
        .mockResolvedValueOnce(mockCommission)
        .mockResolvedValueOnce({
          ...mockCommission,
          adjustments: [{ reason: mockReason, amount: mockAmount }],
          finalAmount: 5500,
        });
      
      const result = await CommissionCalculationService.applyAdjustment(
        mockId,
        mockReason,
        mockAmount
      );
      
      expect(mockCommission.applyAdjustment).toHaveBeenCalledWith(
        mockReason,
        mockAmount,
        undefined,
        undefined
      );
      expect(result).toHaveProperty('finalAmount', 5500);
    });
    
    it('should throw error for paid commission', async () => {
      const mockId = 'validCommissionId';
      
      // Mock getById to return a paid commission
      jest.spyOn(CommissionCalculationService, 'getById')
        .mockResolvedValue({
          _id: mockId,
          status: CommissionStatus.PAID,
        });
      
      await expect(
        CommissionCalculationService.applyAdjustment(
          mockId,
          'Test reason',
          500
        )
      ).rejects.toThrow('Cannot adjust a paid commission');
    });
  });
}); 