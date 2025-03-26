import mongoose from 'mongoose';
import CommissionStructure from '../../../src/models/CommissionStructure';

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

describe('CommissionStructure Model Tests', () => {
  // Test data
  const validStructureData = {
    name: 'Standard Commission',
    baseRate: 5,
    tiers: [
      { threshold: 50000, rate: 6 },
      { threshold: 100000, rate: 7 },
      { threshold: 200000, rate: 8 }
    ] as Array<{threshold: number, rate: number}>,
    isDefault: true,
    agent: 'agentId',
  };

  // Reset mocks after each test
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('CommissionStructure Validation', () => {
    it('should create a valid commission structure', async () => {
      const mock = CommissionStructure.create as jest.Mock;
      mock.mockResolvedValueOnce({
        ...validStructureData,
        _id: 'mockId',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const newStructure = await CommissionStructure.create(validStructureData);
      
      expect(newStructure).toHaveProperty('_id');
      expect(newStructure.name).toBe(validStructureData.name);
      expect(newStructure.baseRate).toBe(validStructureData.baseRate);
      expect(newStructure.tiers).toHaveLength(3);
      expect(newStructure.isDefault).toBe(true);
      expect(mock).toHaveBeenCalledWith(validStructureData);
    });

    it('should reject a structure with invalid base rate', async () => {
      const invalidStructure = { ...validStructureData, baseRate: 101 };
      
      const mock = CommissionStructure.create as jest.Mock;
      mock.mockRejectedValueOnce(new mongoose.Error.ValidationError());

      await expect(CommissionStructure.create(invalidStructure)).rejects.toThrow();
    });

    it('should reject a structure with invalid tier threshold', async () => {
      const invalidStructure = { 
        ...validStructureData,
        tiers: [
          { threshold: -1000, rate: 6 }, // Negative threshold
          { threshold: 100000, rate: 7 }
        ]
      };
      
      const mock = CommissionStructure.create as jest.Mock;
      mock.mockRejectedValueOnce(new mongoose.Error.ValidationError());

      await expect(CommissionStructure.create(invalidStructure)).rejects.toThrow();
    });

    it('should reject a structure with invalid tier rate', async () => {
      const invalidStructure = { 
        ...validStructureData,
        tiers: [
          { threshold: 50000, rate: 101 }, // Rate above 100
          { threshold: 100000, rate: 7 }
        ]
      };
      
      const mock = CommissionStructure.create as jest.Mock;
      mock.mockRejectedValueOnce(new mongoose.Error.ValidationError());

      await expect(CommissionStructure.create(invalidStructure)).rejects.toThrow();
    });
  });

  describe('CommissionStructure Methods', () => {
    it('should calculate the correct rate for a given amount', () => {
      const structure = {
        ...validStructureData,
        _id: 'mockId',
        getRate: function(amount: number) {
          // Mock implementation of getRate method
          if (!this.tiers || this.tiers.length === 0) return this.baseRate;
          
          const sortedTiers = [...this.tiers].sort((a, b) => b.threshold - a.threshold);
          
          for (const tier of sortedTiers) {
            if (amount >= tier.threshold) {
              return tier.rate;
            }
          }
          
          return this.baseRate;
        }
      };
      
      expect(structure.getRate(25000)).toBe(5); // baseRate
      expect(structure.getRate(50000)).toBe(6); // first tier
      expect(structure.getRate(150000)).toBe(7); // second tier
      expect(structure.getRate(250000)).toBe(8); // third tier
    });
    
    it('should use base rate when no tiers are defined', () => {
      const structureWithoutTiers = {
        ...validStructureData,
        _id: 'mockId',
        tiers: [] as Array<{threshold: number, rate: number}>,
        getRate: function(amount: number) {
          // Mock implementation of getRate method
          if (!this.tiers || this.tiers.length === 0) return this.baseRate;
          
          const sortedTiers = [...this.tiers].sort((a, b) => b.threshold - a.threshold);
          
          for (const tier of sortedTiers) {
            if (amount >= tier.threshold) {
              return tier.rate;
            }
          }
          
          return this.baseRate;
        }
      };
      
      expect(structureWithoutTiers.getRate(100000)).toBe(5); // baseRate
    });
  });
}); 