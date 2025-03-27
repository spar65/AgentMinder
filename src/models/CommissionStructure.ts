import mongoose, { Document, Schema } from 'mongoose';
import { mongooseLogger } from '../utils/mongooseLogger';

/**
 * Commission tier interface
 */
export interface CommissionTier {
  min: number;
  max: number | null;
  rate: number;
}

/**
 * Bonus rule interface
 */
export interface BonusRule {
  type: string;
  amount: number;
  condition: string;
}

/**
 * Commission structure document interface
 */
export interface ICommissionStructure extends Document {
  name: string;
  agent: mongoose.Types.ObjectId;
  isDefault: boolean;
  baseRate: number;
  tiers: CommissionTier[];
  bonusRules: BonusRule[];
  effectiveDate: Date;
  expiryDate?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  
  // Methods
  calculateCommission(salesAmount: number): number;
  isCurrentlyActive(): boolean;
}

/**
 * Commission structure schema
 */
const CommissionStructureSchema = new Schema<ICommissionStructure>(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    agent: {
      type: Schema.Types.ObjectId,
      ref: 'Agent',
      required: [true, 'Agent is required'],
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    baseRate: {
      type: Number,
      required: [true, 'Base rate is required'],
      min: [0, 'Base rate cannot be negative'],
      max: [100, 'Base rate cannot exceed 100%'],
    },
    tiers: [{
      min: {
        type: Number,
        required: [true, 'Minimum amount is required'],
        min: [0, 'Minimum amount cannot be negative'],
      },
      max: {
        type: Number,
        default: null,
        validate: {
          validator: function(value: number | null) {
            return value === null || value > (this as any).min;
          },
          message: 'Maximum amount must be greater than minimum amount',
        },
      },
      rate: {
        type: Number,
        required: [true, 'Rate is required'],
        min: [0, 'Rate cannot be negative'],
        max: [100, 'Rate cannot exceed 100%'],
      },
    }],
    bonusRules: [{
      type: {
        type: String,
        required: [true, 'Bonus type is required'],
        enum: ['MONTHLY_GOAL', 'QUARTERLY_GOAL', 'ANNUAL_GOAL'],
      },
      amount: {
        type: Number,
        required: [true, 'Bonus amount is required'],
        min: [0, 'Bonus amount cannot be negative'],
      },
      condition: {
        type: String,
        required: [true, 'Bonus condition is required'],
      },
    }],
    effectiveDate: {
      type: Date,
      required: [true, 'Effective date is required'],
      default: Date.now,
    },
    expiryDate: {
      type: Date,
      validate: {
        validator: function(value: Date | undefined) {
          return !value || value > this.effectiveDate;
        },
        message: 'Expiry date must be after effective date',
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Created by is required'],
    },
    notes: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Add logging plugin
CommissionStructureSchema.plugin(mongooseLogger);

// Create indexes for common queries
CommissionStructureSchema.index({ agent: 1 });
CommissionStructureSchema.index({ isDefault: 1 });
CommissionStructureSchema.index(
  { agent: 1, effectiveDate: 1, expiryDate: 1 },
  { unique: true }
);

// Method to calculate commission for a given sales amount
CommissionStructureSchema.methods.calculateCommission = function(salesAmount: number): number {
  let commission = 0;
  
  // Find applicable tier based on min/max range
  const applicableTier = this.tiers
    .sort((a: CommissionTier, b: CommissionTier) => b.min - a.min)
    .find((tier: CommissionTier) => salesAmount >= tier.min && (!tier.max || salesAmount <= tier.max));

  // Calculate commission based on tier or base rate
  const rate = applicableTier ? applicableTier.rate : this.baseRate;
  commission = salesAmount * (rate / 100);

  return commission;
};

// Method to check if structure is currently active
CommissionStructureSchema.methods.isCurrentlyActive = function(): boolean {
  const now = new Date();
  return (
    this.isActive &&
    now >= this.effectiveDate && 
    (!this.expiryDate || now <= this.expiryDate)
  );
};

// Pre-save hook to ensure tiers are in ascending order by threshold
CommissionStructureSchema.pre('save', function(this: ICommissionStructure, next) {
  // Sort tiers by threshold in ascending order
  if (this.tiers && this.tiers.length > 1) {
    this.tiers.sort((a: CommissionTier, b: CommissionTier) => a.min - b.min);
    
    // Validate that rates increase with thresholds
    for (let i = 1; i < this.tiers.length; i++) {
      if (this.tiers[i].rate < this.tiers[i - 1].rate) {
        const err = new Error('Commission rates must not decrease as thresholds increase');
        return next(err);
      }
      
      if (this.tiers[i].min <= this.tiers[i - 1].min) {
        const err = new Error('Commission thresholds must be in strictly ascending order');
        return next(err);
      }
    }
  }
  
  // If this is a default structure for an agent, ensure no other default exists
  if (this.isDefault && this.agent) {
    mongoose.model('CommissionStructure').findOne({
      agent: this.agent,
      isDefault: true,
      _id: { $ne: this._id }
    }).then(existing => {
      if (existing) {
        existing.isDefault = false;
        return existing.save();
      }
    }).catch(err => {
      console.error('Error updating previous default commission structure:', err);
    });
  }
  
  next();
});

// Export the model
const CommissionStructure = mongoose.model<ICommissionStructure>(
  'CommissionStructure',
  CommissionStructureSchema
);

export default CommissionStructure; 