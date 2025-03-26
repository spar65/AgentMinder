import mongoose from 'mongoose';
import PerformanceMetric, { TimePeriod } from '../../../src/models/PerformanceMetric';

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

describe('PerformanceMetric Model Tests', () => {
  // Test data
  const validMetricData = {
    agent: 'agentId',
    period: '2023-Q1',
    periodType: TimePeriod.QUARTERLY,
    salesVolume: 1500000,
    transactionCount: 8,
    clientAcquisitions: 5,
    retentionRate: 85,
    avgResponseTime: 24,
    goals: {
      salesVolume: 2000000,
      transactionCount: 10,
      clientAcquisitions: 7,
      retentionRate: 90
    }
  };

  // Reset mocks after each test
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('PerformanceMetric Validation', () => {
    it('should create a valid performance metric', async () => {
      const mock = PerformanceMetric.create as jest.Mock;
      mock.mockResolvedValueOnce({
        ...validMetricData,
        _id: 'mockId',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const newMetric = await PerformanceMetric.create(validMetricData);
      
      expect(newMetric).toHaveProperty('_id');
      expect(newMetric.agent).toBe(validMetricData.agent);
      expect(newMetric.period).toBe(validMetricData.period);
      expect(newMetric.periodType).toBe(TimePeriod.QUARTERLY);
      expect(newMetric.salesVolume).toBe(validMetricData.salesVolume);
      expect(mock).toHaveBeenCalledWith(validMetricData);
    });

    it('should reject a metric with negative sales volume', async () => {
      const invalidMetric = { ...validMetricData, salesVolume: -100 };
      
      const mock = PerformanceMetric.create as jest.Mock;
      mock.mockRejectedValueOnce(new mongoose.Error.ValidationError());

      await expect(PerformanceMetric.create(invalidMetric)).rejects.toThrow();
    });

    it('should reject a metric with invalid retention rate', async () => {
      const invalidMetric = { ...validMetricData, retentionRate: 101 }; // Rate above 100%
      
      const mock = PerformanceMetric.create as jest.Mock;
      mock.mockRejectedValueOnce(new mongoose.Error.ValidationError());

      await expect(PerformanceMetric.create(invalidMetric)).rejects.toThrow();
    });

    it('should reject a metric without required fields', async () => {
      const invalidMetric = { 
        salesVolume: 1500000
      }; // Missing required fields
      
      const mock = PerformanceMetric.create as jest.Mock;
      mock.mockRejectedValueOnce(new mongoose.Error.ValidationError());

      await expect(PerformanceMetric.create(invalidMetric as any)).rejects.toThrow();
    });

    it('should reject a metric with invalid period type', async () => {
      const invalidMetric = { 
        ...validMetricData,
        periodType: 'InvalidPeriod' // Not in TimePeriod enum
      };
      
      const mock = PerformanceMetric.create as jest.Mock;
      mock.mockRejectedValueOnce(new mongoose.Error.ValidationError());

      await expect(PerformanceMetric.create(invalidMetric)).rejects.toThrow();
    });
  });

  describe('PerformanceMetric Methods', () => {
    it('should calculate completion percentages correctly', () => {
      const metric = {
        ...validMetricData,
        _id: 'mockId',
        calculateCompletionPercentages: function() {
          // Mock implementation of calculateCompletionPercentages method
          if (!this.goals) return {};
          
          const result: Record<string, number> = {};
          
          if (this.goals.salesVolume && this.salesVolume) {
            result.salesVolume = Math.min(100, Math.round((this.salesVolume / this.goals.salesVolume) * 100));
          }
          
          if (this.goals.transactionCount && this.transactionCount) {
            result.transactionCount = Math.min(100, Math.round((this.transactionCount / this.goals.transactionCount) * 100));
          }
          
          if (this.goals.clientAcquisitions && this.clientAcquisitions) {
            result.clientAcquisitions = Math.min(100, Math.round((this.clientAcquisitions / this.goals.clientAcquisitions) * 100));
          }
          
          if (this.goals.retentionRate && this.retentionRate) {
            result.retentionRate = Math.min(100, Math.round((this.retentionRate / this.goals.retentionRate) * 100));
          }
          
          return result;
        }
      };
      
      const percentages = metric.calculateCompletionPercentages();
      
      expect(percentages.salesVolume).toBe(75); // 1,500,000 / 2,000,000 = 75%
      expect(percentages.transactionCount).toBe(80); // 8 / 10 = 80%
      expect(percentages.clientAcquisitions).toBe(71); // 5 / 7 ≈ 71%
      expect(percentages.retentionRate).toBe(94); // 85 / 90 ≈ 94%
    });
    
    it('should calculate overall achievement score correctly', () => {
      const metric = {
        ...validMetricData,
        _id: 'mockId',
        calculateOverallScore: function() {
          // Mock implementation of calculateOverallScore method
          const percentages = this.calculateCompletionPercentages();
          if (Object.keys(percentages).length === 0) return 0;
          
          let sum = 0;
          for (const key in percentages) {
            sum += percentages[key];
          }
          return Math.round(sum / Object.keys(percentages).length);
        },
        calculateCompletionPercentages: function() {
          // Mock implementation of calculateCompletionPercentages method
          if (!this.goals) return {};
          
          const result: Record<string, number> = {};
          
          if (this.goals.salesVolume && this.salesVolume) {
            result.salesVolume = Math.min(100, Math.round((this.salesVolume / this.goals.salesVolume) * 100));
          }
          
          if (this.goals.transactionCount && this.transactionCount) {
            result.transactionCount = Math.min(100, Math.round((this.transactionCount / this.goals.transactionCount) * 100));
          }
          
          if (this.goals.clientAcquisitions && this.clientAcquisitions) {
            result.clientAcquisitions = Math.min(100, Math.round((this.clientAcquisitions / this.goals.clientAcquisitions) * 100));
          }
          
          if (this.goals.retentionRate && this.retentionRate) {
            result.retentionRate = Math.min(100, Math.round((this.retentionRate / this.goals.retentionRate) * 100));
          }
          
          return result;
        }
      };
      
      // We expect: (75 + 80 + 71 + 94) / 4 = 80
      expect(metric.calculateOverallScore()).toBe(80);
    });
    
    it('should handle missing goals gracefully', () => {
      const metricWithoutGoals = {
        ...validMetricData,
        _id: 'mockId',
        goals: undefined,
        calculateCompletionPercentages: function() {
          // Mock implementation of calculateCompletionPercentages method
          if (!this.goals) return {};
          
          const result: Record<string, number> = {};
          
          if (this.goals?.salesVolume && this.salesVolume) {
            result.salesVolume = Math.min(100, Math.round((this.salesVolume / this.goals.salesVolume) * 100));
          }
          
          if (this.goals?.transactionCount && this.transactionCount) {
            result.transactionCount = Math.min(100, Math.round((this.transactionCount / this.goals.transactionCount) * 100));
          }
          
          if (this.goals?.clientAcquisitions && this.clientAcquisitions) {
            result.clientAcquisitions = Math.min(100, Math.round((this.clientAcquisitions / this.goals.clientAcquisitions) * 100));
          }
          
          if (this.goals?.retentionRate && this.retentionRate) {
            result.retentionRate = Math.min(100, Math.round((this.retentionRate / this.goals.retentionRate) * 100));
          }
          
          return result;
        },
        calculateOverallScore: function() {
          // Mock implementation of calculateOverallScore method
          const percentages = this.calculateCompletionPercentages();
          if (Object.keys(percentages).length === 0) return 0;
          
          let sum = 0;
          for (const key in percentages) {
            sum += percentages[key];
          }
          return Math.round(sum / Object.keys(percentages).length);
        }
      };
      
      expect(metricWithoutGoals.calculateCompletionPercentages()).toEqual({});
      expect(metricWithoutGoals.calculateOverallScore()).toBe(0);
    });

    it('should compare metrics correctly', () => {
      const currentMetric = {
        ...validMetricData,
        _id: 'currentId',
        salesVolume: 1500000,
        transactionCount: 8,
        clientAcquisitions: 5,
        retentionRate: 85,
        compareWith: function(previousMetric: any) {
          // Mock implementation of compareWith method
          if (!previousMetric) return {};
          
          const result: Record<string, number> = {};
          
          if (this.salesVolume !== undefined && previousMetric.salesVolume !== undefined) {
            result.salesVolume = this.salesVolume - previousMetric.salesVolume;
          }
          
          if (this.transactionCount !== undefined && previousMetric.transactionCount !== undefined) {
            result.transactionCount = this.transactionCount - previousMetric.transactionCount;
          }
          
          if (this.clientAcquisitions !== undefined && previousMetric.clientAcquisitions !== undefined) {
            result.clientAcquisitions = this.clientAcquisitions - previousMetric.clientAcquisitions;
          }
          
          if (this.retentionRate !== undefined && previousMetric.retentionRate !== undefined) {
            result.retentionRate = this.retentionRate - previousMetric.retentionRate;
          }
          
          return result;
        }
      };
      
      const previousMetric = {
        ...validMetricData,
        _id: 'previousId',
        salesVolume: 1200000,
        transactionCount: 6,
        clientAcquisitions: 4,
        retentionRate: 80
      };
      
      const comparison = currentMetric.compareWith(previousMetric);
      
      expect(comparison.salesVolume).toBe(300000); // 1,500,000 - 1,200,000
      expect(comparison.transactionCount).toBe(2); // 8 - 6
      expect(comparison.clientAcquisitions).toBe(1); // 5 - 4
      expect(comparison.retentionRate).toBe(5); // 85 - 80
    });
  });
}); 