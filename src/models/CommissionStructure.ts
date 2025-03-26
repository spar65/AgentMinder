import mongoose, { Document, Schema } from 'mongoose';

/**
 * Commission tier interface
 */
export interface CommissionTier {
  threshold: number;
  rate: number;
}

/**
 * Bonus rule interface
 */
export interface BonusRule {
  type: 'newClient' | 'retention' | 'upsell';
  amount: number;
  description?: string;
}

/**
 * Commission structure document interface
 */
export interface ICommissionStructure extends Document {
  name: string;
  agent?: mongoose.Types.ObjectId;
  isDefault: boolean;
  baseRate: number;
  tiers: CommissionTier[];
  bonusRules: BonusRule[];
  effectiveDate: Date;
  expirationDate?: Date;
  createdBy: mongoose.Types.ObjectId;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  
  // Methods
  calculateCommission(salesAmount: number, bonusTypes?: string[]): number;
  isActive(): boolean;
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
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    baseRate: {
      type: Number,
      required: [true, 'Base commission rate is required'],
      min: [0, 'Base rate cannot be negative'],
      max: [100, 'Base rate cannot exceed 100%'],
    },
    tiers: [
      {
        threshold: {
          type: Number,
          required: [true, 'Threshold amount is required'],
          min: [0, 'Threshold cannot be negative'],
        },
        rate: {
          type: Number,
          required: [true, 'Commission rate is required'],
          min: [0, 'Rate cannot be negative'],
          max: [100, 'Rate cannot exceed 100%'],
        },
      },
    ],
    bonusRules: [
      {
        type: {
          type: String,
          enum: ['newClient', 'retention', 'upsell'],
          required: [true, 'Bonus type is required'],
        },
        amount: {
          type: Number,
          required: [true, 'Bonus amount is required'],
          min: [0, 'Bonus amount cannot be negative'],
        },
        description: {
          type: String,
        },
      },
    ],
    effectiveDate: {
      type: Date,
      required: [true, 'Effective date is required'],
      default: Date.now,
    },
    expirationDate: {
      type: Date,
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

// Create indexes for common queries
CommissionStructureSchema.index({ agent: 1 });
CommissionStructureSchema.index({ isDefault: 1 });
CommissionStructureSchema.index({ effectiveDate: 1, expirationDate: 1 });

// Method to calculate commission based on sales amount and bonus types
CommissionStructureSchema.methods.calculateCommission = function(
  this: ICommissionStructure,
  salesAmount: number, 
  bonusTypes: string[] = []
): number {
  // Start with base commission
  let commissionRate = this.baseRate;
  
  // Apply tiered rates if applicable
  if (this.tiers && this.tiers.length > 0) {
    // Sort tiers by threshold in descending order
    const sortedTiers = [...this.tiers].sort((a, b) => b.threshold - a.threshold);
    
    // Find the highest tier that applies to this sales amount
    const applicableTier = sortedTiers.find(tier => salesAmount >= tier.threshold);
    
    if (applicableTier) {
      commissionRate = applicableTier.rate;
    }
  }
  
  // Calculate base commission amount
  let commissionAmount = (salesAmount * commissionRate) / 100;
  
  // Apply bonuses if applicable
  if (bonusTypes.length > 0 && this.bonusRules && this.bonusRules.length > 0) {
    for (const bonusType of bonusTypes) {
      const bonus = this.bonusRules.find(rule => rule.type === bonusType);
      if (bonus) {
        commissionAmount += bonus.amount;
      }
    }
  }
  
  return commissionAmount;
};

// Method to check if commission structure is currently active
CommissionStructureSchema.methods.isActive = function(this: ICommissionStructure): boolean {
  const now = new Date();
  return (
    now >= this.effectiveDate && 
    (!this.expirationDate || now <= this.expirationDate)
  );
};

// Pre-save hook to ensure tiers are in ascending order by threshold
CommissionStructureSchema.pre('save', function(this: ICommissionStructure, next) {
  // Sort tiers by threshold in ascending order
  if (this.tiers && this.tiers.length > 1) {
    this.tiers.sort((a, b) => a.threshold - b.threshold);
    
    // Validate that rates increase with thresholds
    for (let i = 1; i < this.tiers.length; i++) {
      if (this.tiers[i].rate < this.tiers[i - 1].rate) {
        const err = new Error('Commission rates must not decrease as thresholds increase');
        return next(err);
      }
      
      if (this.tiers[i].threshold <= this.tiers[i - 1].threshold) {
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