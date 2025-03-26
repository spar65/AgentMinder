import mongoose, { Document, Schema } from 'mongoose';

/**
 * Commission status enum
 */
export enum CommissionStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  PAID = 'paid',
  DISPUTED = 'disputed',
  CANCELED = 'canceled'
}

/**
 * Commission adjustment interface
 */
export interface CommissionAdjustment {
  reason: string;
  amount: number;
  description?: string;
  appliedBy?: mongoose.Types.ObjectId;
  appliedAt: Date;
}

/**
 * Commission calculation document interface
 */
export interface ICommissionCalculation extends Document {
  agent: mongoose.Types.ObjectId;
  transaction: mongoose.Types.ObjectId;
  commissionStructure: mongoose.Types.ObjectId;
  baseAmount: number;
  rate: number;
  adjustments: CommissionAdjustment[];
  finalAmount: number;
  status: CommissionStatus;
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  paidIn?: mongoose.Types.ObjectId;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  
  // Methods
  applyAdjustment(reason: string, amount: number, appliedBy?: mongoose.Types.ObjectId, description?: string): Promise<void>;
  approve(approvedBy: mongoose.Types.ObjectId): Promise<void>;
  markAsPaid(transactionId: mongoose.Types.ObjectId): Promise<void>;
}

/**
 * Commission calculation schema
 */
const CommissionCalculationSchema = new Schema<ICommissionCalculation>(
  {
    agent: {
      type: Schema.Types.ObjectId,
      ref: 'Agent',
      required: [true, 'Agent is required'],
    },
    transaction: {
      type: Schema.Types.ObjectId,
      ref: 'Transaction',
      required: [true, 'Transaction is required'],
    },
    commissionStructure: {
      type: Schema.Types.ObjectId,
      ref: 'CommissionStructure',
      required: [true, 'Commission structure is required'],
    },
    baseAmount: {
      type: Number,
      required: [true, 'Base amount is required'],
      min: [0, 'Base amount cannot be negative'],
    },
    rate: {
      type: Number,
      required: [true, 'Commission rate is required'],
      min: [0, 'Rate cannot be negative'],
      max: [100, 'Rate cannot exceed 100%'],
    },
    adjustments: [
      {
        reason: {
          type: String,
          required: [true, 'Adjustment reason is required'],
        },
        amount: {
          type: Number,
          required: [true, 'Adjustment amount is required'],
        },
        description: {
          type: String,
        },
        appliedBy: {
          type: Schema.Types.ObjectId,
          ref: 'User',
        },
        appliedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    finalAmount: {
      type: Number,
      required: [true, 'Final amount is required'],
      min: [0, 'Final amount cannot be negative'],
    },
    status: {
      type: String,
      enum: Object.values(CommissionStatus),
      default: CommissionStatus.PENDING,
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedAt: {
      type: Date,
    },
    paidIn: {
      type: Schema.Types.ObjectId,
      ref: 'Transaction',
    },
    notes: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Create indexes for common queries
CommissionCalculationSchema.index({ agent: 1 });
CommissionCalculationSchema.index({ transaction: 1 });
CommissionCalculationSchema.index({ status: 1 });
CommissionCalculationSchema.index({ createdAt: 1 });

// Compound index for agent + status queries
CommissionCalculationSchema.index({ agent: 1, status: 1 });

// Method to apply an adjustment to the commission
CommissionCalculationSchema.methods.applyAdjustment = async function(
  this: ICommissionCalculation,
  reason: string,
  amount: number,
  appliedBy?: mongoose.Types.ObjectId,
  description?: string
): Promise<void> {
  // Create the adjustment
  const adjustment: CommissionAdjustment = {
    reason,
    amount,
    appliedAt: new Date(),
    ...(appliedBy && { appliedBy }),
    ...(description && { description })
  };
  
  // Add to adjustments array
  this.adjustments.push(adjustment);
  
  // Recalculate final amount
  this.finalAmount = this.calculateFinalAmount();
  
  await this.save();
};

// Method to approve a commission
CommissionCalculationSchema.methods.approve = async function(
  this: ICommissionCalculation,
  approvedBy: mongoose.Types.ObjectId
): Promise<void> {
  if (this.status === CommissionStatus.PENDING) {
    this.status = CommissionStatus.APPROVED;
    this.approvedBy = approvedBy;
    this.approvedAt = new Date();
    
    await this.save();
  } else {
    throw new Error(`Cannot approve commission with status: ${this.status}`);
  }
};

// Method to mark commission as paid
CommissionCalculationSchema.methods.markAsPaid = async function(
  this: ICommissionCalculation,
  transactionId: mongoose.Types.ObjectId
): Promise<void> {
  if (this.status === CommissionStatus.APPROVED) {
    this.status = CommissionStatus.PAID;
    this.paidIn = transactionId;
    
    await this.save();
  } else {
    throw new Error(`Cannot mark as paid. Commission must be approved first. Current status: ${this.status}`);
  }
};

// Helper method to calculate the final amount
CommissionCalculationSchema.methods.calculateFinalAmount = function(this: ICommissionCalculation): number {
  // Start with base commission amount
  let baseCommission = (this.baseAmount * this.rate) / 100;
  
  // Apply all adjustments
  let totalAdjustments = 0;
  if (this.adjustments && this.adjustments.length > 0) {
    totalAdjustments = this.adjustments.reduce((sum, adjustment) => sum + adjustment.amount, 0);
  }
  
  return Math.max(0, baseCommission + totalAdjustments);
};

// Pre-save hook to recalculate final amount
CommissionCalculationSchema.pre('save', function(this: ICommissionCalculation, next) {
  // If this is a new document or adjustments have been modified, recalculate final amount
  if (this.isNew || this.isModified('adjustments') || this.isModified('baseAmount') || this.isModified('rate')) {
    this.finalAmount = this.calculateFinalAmount();
  }
  
  next();
});

/**
 * Static method to calculate total pending commissions for an agent
 */
CommissionCalculationSchema.statics.getPendingCommissionsTotal = async function(
  agentId: mongoose.Types.ObjectId
): Promise<number> {
  const result = await this.aggregate([
    {
      $match: {
        agent: agentId,
        status: CommissionStatus.PENDING
      }
    },
    {
      $group: {
        _id: null,
        total: { $sum: '$finalAmount' }
      }
    }
  ]);
  
  return result.length > 0 ? result[0].total : 0;
};

/**
 * Static method to get commission statistics for an agent
 */
CommissionCalculationSchema.statics.getAgentCommissionStats = async function(
  agentId: mongoose.Types.ObjectId,
  startDate?: Date,
  endDate?: Date
): Promise<Record<string, any>> {
  const matchStage: Record<string, any> = { agent: agentId };
  
  if (startDate || endDate) {
    matchStage.createdAt = {};
    if (startDate) matchStage.createdAt.$gte = startDate;
    if (endDate) matchStage.createdAt.$lte = endDate;
  }
  
  const result = await this.aggregate([
    {
      $match: matchStage
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        total: { $sum: '$finalAmount' }
      }
    }
  ]);
  
  // Format into a more usable structure
  const stats: Record<string, { count: number; total: number }> = {};
  
  result.forEach(item => {
    stats[item._id] = {
      count: item.count,
      total: item.total
    };
  });
  
  return stats;
};

// Export the model
const CommissionCalculation = mongoose.model<ICommissionCalculation>(
  'CommissionCalculation',
  CommissionCalculationSchema
);

export default CommissionCalculation; 