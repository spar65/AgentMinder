import mongoose, { Document, Schema } from 'mongoose';
import { mongooseLogger } from '../utils/mongooseLogger';

/**
 * Time period enumeration (Monthly, Quarterly, Yearly)
 */
export enum TimePeriod {
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  YEARLY = 'yearly'
}

/**
 * Performance metric interface
 */
export interface IPerformanceMetric extends Document {
  agent: mongoose.Types.ObjectId;
  period: string; // Format: '2023-Q1', '2023-01', '2023'
  periodType: TimePeriod;
  salesVolume: number;
  transactionCount: number;
  clientAcquisitions: number;
  retentionRate: number;
  avgResponseTime: number;
  goals?: {
    salesVolume?: number;
    transactionCount?: number;
    clientAcquisitions?: number;
    retentionRate?: number;
  };
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Performance metric schema
 */
const PerformanceMetricSchema = new Schema<IPerformanceMetric>(
  {
    agent: {
      type: Schema.Types.ObjectId,
      ref: 'Agent',
      required: [true, 'Agent is required'],
    },
    period: {
      type: String,
      required: [true, 'Period is required'],
      index: true,
    },
    periodType: {
      type: String,
      enum: Object.values(TimePeriod),
      required: [true, 'Period type is required'],
    },
    salesVolume: {
      type: Number,
      default: 0,
    },
    transactionCount: {
      type: Number,
      default: 0,
    },
    clientAcquisitions: {
      type: Number,
      default: 0,
    },
    retentionRate: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    avgResponseTime: {
      type: Number,
      min: 0,
      default: 0,
    },
    goals: {
      salesVolume: {
        type: Number,
        min: 0,
      },
      transactionCount: {
        type: Number,
        min: 0,
      },
      clientAcquisitions: {
        type: Number,
        min: 0,
      },
      retentionRate: {
        type: Number,
        min: 0,
        max: 100,
      },
    },
    notes: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Create a compound index on agent and period for efficient lookups
PerformanceMetricSchema.index({ agent: 1, period: 1 }, { unique: true });

// Create index on periodType for filtering by time period
PerformanceMetricSchema.index({ periodType: 1 });

/**
 * Static method to calculate team performance metrics
 */
PerformanceMetricSchema.statics.calculateTeamMetrics = async function(
  supervisorId: mongoose.Types.ObjectId,
  period: string,
  periodType: TimePeriod
): Promise<any> {
  const Agent = mongoose.model('Agent');
  const teamMembers = await Agent.find({ supervisor: supervisorId });
  const teamMemberIds = teamMembers.map(member => member._id);
  
  // Include the supervisor in the calculation
  teamMemberIds.push(supervisorId);
  
  const metrics = await this.find({
    agent: { $in: teamMemberIds },
    period,
    periodType
  });
  
  if (!metrics.length) return null;
  
  // Calculate aggregate metrics
  const result = {
    teamSize: teamMemberIds.length,
    period,
    periodType,
    totalSalesVolume: 0,
    totalTransactionCount: 0,
    totalClientAcquisitions: 0,
    avgRetentionRate: 0,
    avgResponseTime: 0
  };
  
  metrics.forEach(metric => {
    result.totalSalesVolume += metric.salesVolume;
    result.totalTransactionCount += metric.transactionCount;
    result.totalClientAcquisitions += metric.clientAcquisitions;
    result.avgRetentionRate += metric.retentionRate;
    result.avgResponseTime += metric.avgResponseTime;
  });
  
  // Calculate averages
  result.avgRetentionRate = result.avgRetentionRate / metrics.length;
  result.avgResponseTime = result.avgResponseTime / metrics.length;
  
  return result;
};

/**
 * Static method to get performance trends for an agent
 */
PerformanceMetricSchema.statics.getPerformanceTrends = async function(
  agentId: mongoose.Types.ObjectId,
  periodType: TimePeriod,
  limit: number = 6
): Promise<IPerformanceMetric[]> {
  return this.find({ 
    agent: agentId,
    periodType
  })
  .sort({ period: -1 })
  .limit(limit);
};

// Add logging plugin
PerformanceMetricSchema.plugin(mongooseLogger);

// Export the model
const PerformanceMetric = mongoose.model<IPerformanceMetric>(
  'PerformanceMetric',
  PerformanceMetricSchema
);

export default PerformanceMetric; 