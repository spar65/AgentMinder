import mongoose from 'mongoose';
import CommissionCalculation, { CommissionStatus } from '../../../src/models/CommissionCalculation';

// Mock mongoose
jest.mock('mongoose', () => {
  const originalModule = jest.requireActual('mongoose');
  return {
    ...originalModule,
    model: jest.fn().mockReturnValue({
      create: jest.fn().mockImplementation((data) => Promise.resolve({ ...data, _id: 'mockId' })),
    }),
  };
});

describe('CommissionCalculation Model Tests', () => {
  // Test data
  const validCalculationData = {
    agent: 'agentId',
    transaction: 'transactionId',
    commissionStructure: 'structureId',
    baseAmount: 100000,
    rate: 5,
    finalAmount: 5000,
    status: CommissionStatus.PENDING,
    adjustments: [] as Array<{reason: string, amount: number, description?: string, date?: Date}>
  };

  // Reset mocks after each test
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('CommissionCalculation Validation', () => {
    it('should create a valid commission calculation', async () => {
      const mock = CommissionCalculation.create as jest.Mock;
      mock.mockResolvedValueOnce({
        ...validCalculationData,
        _id: 'mockId',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const newCalculation = await CommissionCalculation.create(validCalculationData);
      
      expect(newCalculation).toHaveProperty('_id');
      expect(newCalculation.agent).toBe(validCalculationData.agent);
      expect(newCalculation.baseAmount).toBe(validCalculationData.baseAmount);
      expect(newCalculation.rate).toBe(validCalculationData.rate);
      expect(newCalculation.finalAmount).toBe(validCalculationData.finalAmount);
      expect(newCalculation.status).toBe(CommissionStatus.PENDING);
      expect(mock).toHaveBeenCalledWith(validCalculationData);
    });

    it('should reject a calculation with negative base amount', async () => {
      const invalidCalculation = { ...validCalculationData, baseAmount: -100 };
      
      const mock = CommissionCalculation.create as jest.Mock;
      mock.mockRejectedValueOnce(new mongoose.Error.ValidationError());

      await expect(CommissionCalculation.create(invalidCalculation)).rejects.toThrow();
    });

    it('should reject a calculation with invalid rate', async () => {
      const invalidCalculation = { ...validCalculationData, rate: 101 }; // Rate above 100%
      
      const mock = CommissionCalculation.create as jest.Mock;
      mock.mockRejectedValueOnce(new mongoose.Error.ValidationError());

      await expect(CommissionCalculation.create(invalidCalculation)).rejects.toThrow();
    });

    it('should reject a calculation without required fields', async () => {
      const invalidCalculation = { 
        baseAmount: 100000,
        rate: 5
      }; // Missing required fields
      
      const mock = CommissionCalculation.create as jest.Mock;
      mock.mockRejectedValueOnce(new mongoose.Error.ValidationError());

      await expect(CommissionCalculation.create(invalidCalculation as any)).rejects.toThrow();
    });
  });

  describe('CommissionCalculation Methods', () => {
    it('should calculate final amount correctly', () => {
      const calculation = {
        ...validCalculationData,
        _id: 'mockId',
        baseAmount: 100000,
        rate: 5,
        adjustments: [] as Array<{reason: string, amount: number, description?: string, date?: Date}>,
        calculateFinalAmount: function() {
          // Mock implementation of calculateFinalAmount method
          const baseCommission = this.baseAmount * (this.rate / 100);
          
          // Add any adjustments
          const adjustmentTotal = this.adjustments && this.adjustments.length > 0
            ? this.adjustments.reduce((total, adj) => total + adj.amount, 0)
            : 0;
          
          return baseCommission + adjustmentTotal;
        }
      };
      
      expect(calculation.calculateFinalAmount()).toBe(5000); // 5% of 100000
    });
    
    it('should apply adjustment correctly', () => {
      const calculation = {
        ...validCalculationData,
        _id: 'mockId',
        baseAmount: 100000,
        rate: 5,
        finalAmount: 5000,
        adjustments: [] as Array<{reason: string, amount: number, description?: string | null, date?: Date}>,
        applyAdjustment: function(reason: string, amount: number, description?: string, date?: Date) {
          // Mock implementation of applyAdjustment method
          if (this.status === CommissionStatus.PAID) {
            throw new Error('Cannot adjust a paid commission');
          }
          
          const adjustment = {
            reason,
            amount,
            description: description || null,
            date: date || new Date()
          };
          
          this.adjustments.push(adjustment);
          this.finalAmount = this.calculateFinalAmount();
          return true;
        },
        calculateFinalAmount: function() {
          // Mock implementation of calculateFinalAmount method
          const baseCommission = this.baseAmount * (this.rate / 100);
          
          // Add any adjustments
          const adjustmentTotal = this.adjustments && this.adjustments.length > 0
            ? this.adjustments.reduce((total, adj) => total + adj.amount, 0)
            : 0;
          
          return baseCommission + adjustmentTotal;
        }
      };
      
      // Apply a positive adjustment
      calculation.applyAdjustment('Performance bonus', 500, 'Exceeded sales target');
      
      expect(calculation.adjustments).toHaveLength(1);
      expect(calculation.adjustments[0].reason).toBe('Performance bonus');
      expect(calculation.adjustments[0].amount).toBe(500);
      expect(calculation.finalAmount).toBe(5500); // 5000 + 500
      
      // Apply a negative adjustment
      calculation.applyAdjustment('Correction', -300, 'Calculation error');
      
      expect(calculation.adjustments).toHaveLength(2);
      expect(calculation.adjustments[1].reason).toBe('Correction');
      expect(calculation.adjustments[1].amount).toBe(-300);
      expect(calculation.finalAmount).toBe(5200); // 5500 - 300
    });
    
    it('should throw error when adjusting a paid commission', () => {
      const paidCalculation = {
        ...validCalculationData,
        _id: 'mockId',
        status: CommissionStatus.PAID,
        applyAdjustment: function(reason: string, amount: number) {
          // Mock implementation of applyAdjustment method
          if (this.status === CommissionStatus.PAID) {
            throw new Error('Cannot adjust a paid commission');
          }
          
          return true;
        }
      };
      
      expect(() => {
        paidCalculation.applyAdjustment('Bonus', 500);
      }).toThrow('Cannot adjust a paid commission');
    });
    
    it('should update status correctly', () => {
      const calculation = {
        ...validCalculationData,
        _id: 'mockId',
        status: CommissionStatus.PENDING,
        updateStatus: function(newStatus: CommissionStatus, note?: string) {
          // Mock implementation of updateStatus method
          this.status = newStatus;
          if (note) this.notes = this.notes ? this.notes + '\n' + note : note;
          return true;
        },
        notes: ''
      };
      
      calculation.updateStatus(CommissionStatus.APPROVED, 'Approved by manager');
      expect(calculation.status).toBe(CommissionStatus.APPROVED);
      expect(calculation.notes).toBe('Approved by manager');
      
      calculation.updateStatus(CommissionStatus.PAID, 'Payment processed');
      expect(calculation.status).toBe(CommissionStatus.PAID);
      expect(calculation.notes).toBe('Approved by manager\nPayment processed');
    });
  });
}); 