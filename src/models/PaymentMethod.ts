import mongoose, { Document, Schema } from 'mongoose';
import { mongooseLogger } from '../utils/mongooseLogger';

/**
 * Payment method type enum
 */
export enum PaymentMethodType {
  CARD = 'card',
  BANK_ACCOUNT = 'bank_account',
  WALLET = 'wallet'
}

/**
 * Payment method status enum
 */
export enum PaymentMethodStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  EXPIRED = 'expired',
  FAILED = 'failed'
}

/**
 * Payment method document interface
 */
export interface IPaymentMethod extends Document {
  owner: mongoose.Types.ObjectId;
  ownerType: 'Agent' | 'Client';
  stripeCustomerId?: string;
  stripePaymentMethodId?: string;
  type: PaymentMethodType;
  status: PaymentMethodStatus;
  isDefault: boolean;
  last4?: string;
  expiryMonth?: number;
  expiryYear?: number;
  brand?: string;
  bankName?: string;
  country?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Payment method schema
 */
const PaymentMethodSchema = new Schema<IPaymentMethod>(
  {
    owner: {
      type: Schema.Types.ObjectId,
      required: [true, 'Owner is required'],
      refPath: 'ownerType'
    },
    ownerType: {
      type: String,
      required: [true, 'Owner type is required'],
      enum: ['Agent', 'Client']
    },
    stripeCustomerId: {
      type: String
    },
    stripePaymentMethodId: {
      type: String
    },
    type: {
      type: String,
      enum: Object.values(PaymentMethodType),
      required: [true, 'Payment method type is required']
    },
    status: {
      type: String,
      enum: Object.values(PaymentMethodStatus),
      default: PaymentMethodStatus.ACTIVE
    },
    isDefault: {
      type: Boolean,
      default: false
    },
    last4: {
      type: String,
      minlength: 4,
      maxlength: 4
    },
    expiryMonth: {
      type: Number,
      min: 1,
      max: 12
    },
    expiryYear: {
      type: Number,
      min: 2000
    },
    brand: {
      type: String
    },
    bankName: {
      type: String
    },
    country: {
      type: String,
      minlength: 2,
      maxlength: 2
    },
    metadata: {
      type: Schema.Types.Mixed
    }
  },
  {
    timestamps: true
  }
);

// Create indexes for common queries
PaymentMethodSchema.index({ owner: 1, ownerType: 1 });
PaymentMethodSchema.index({ stripeCustomerId: 1 });
PaymentMethodSchema.index({ owner: 1, isDefault: 1 });

// Pre-save hook to handle default payment method
PaymentMethodSchema.pre('save', async function(this: IPaymentMethod, next) {
  // If this is being set as default, unset any other default for this owner
  if (this.isDefault && (this.isModified('isDefault') || this.isNew)) {
    try {
      await mongoose.model('PaymentMethod').updateMany(
        { 
          owner: this.owner, 
          ownerType: this.ownerType,
          _id: { $ne: this._id },
          isDefault: true 
        },
        { isDefault: false }
      );
    } catch (err) {
      return next(err);
    }
  }
  
  next();
});

// Pre-save hook to check expiry date and update status if needed
PaymentMethodSchema.pre('save', function(this: IPaymentMethod, next) {
  // Only check expiry for card payment methods
  if (this.type === PaymentMethodType.CARD && this.expiryMonth && this.expiryYear) {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // JavaScript months are 0-indexed
    
    // Check if the card is expired
    if (
      this.expiryYear < currentYear || 
      (this.expiryYear === currentYear && this.expiryMonth < currentMonth)
    ) {
      this.status = PaymentMethodStatus.EXPIRED;
    }
  }
  
  next();
});

/**
 * Static method to get all active payment methods for an owner
 */
PaymentMethodSchema.statics.getActivePaymentMethods = function(
  ownerId: mongoose.Types.ObjectId,
  ownerType: 'Agent' | 'Client'
): Promise<IPaymentMethod[]> {
  return this.find({
    owner: ownerId,
    ownerType,
    status: PaymentMethodStatus.ACTIVE
  }).sort({ isDefault: -1, createdAt: -1 });
};

/**
 * Static method to get the default payment method for an owner
 */
PaymentMethodSchema.statics.getDefaultPaymentMethod = function(
  ownerId: mongoose.Types.ObjectId,
  ownerType: 'Agent' | 'Client'
): Promise<IPaymentMethod | null> {
  return this.findOne({
    owner: ownerId,
    ownerType,
    isDefault: true,
    status: PaymentMethodStatus.ACTIVE
  });
};

// Add logging plugin
PaymentMethodSchema.plugin(mongooseLogger);

// Export the model
const PaymentMethod = mongoose.model<IPaymentMethod>('PaymentMethod', PaymentMethodSchema);

export default PaymentMethod; 