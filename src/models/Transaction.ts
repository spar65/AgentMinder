import mongoose, { Document, Schema } from 'mongoose';

/**
 * Transaction status enum
 */
export enum TransactionStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  DISPUTED = 'disputed',
  REFUNDED = 'refunded',
  CANCELED = 'canceled'
}

/**
 * Transaction type enum
 */
export enum TransactionType {
  PAYMENT = 'payment',
  REFUND = 'refund',
  COMMISSION = 'commission',
  ADJUSTMENT = 'adjustment',
  FEE = 'fee'
}

/**
 * Status history interface
 */
export interface StatusChange {
  status: TransactionStatus;
  timestamp: Date;
  note?: string;
  changedBy?: mongoose.Types.ObjectId;
}

/**
 * Transaction document interface
 */
export interface ITransaction extends Document {
  reference: string;
  amount: number;
  currency: string;
  type: TransactionType;
  status: TransactionStatus;
  statusHistory: StatusChange[];
  description: string;
  agent?: mongoose.Types.ObjectId;
  client?: mongoose.Types.ObjectId;
  paymentMethod?: mongoose.Types.ObjectId;
  commissionCalculation?: mongoose.Types.ObjectId;
  relatedTransactions?: mongoose.Types.ObjectId[];
  stripePaymentIntentId?: string;
  stripeTransferId?: string;
  externalReference?: string;
  metadata?: Record<string, unknown>;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  
  // Methods
  updateStatus(status: TransactionStatus, note?: string, changedBy?: mongoose.Types.ObjectId): Promise<void>;
  addRelatedTransaction(transactionId: mongoose.Types.ObjectId): Promise<void>;
}

/**
 * Transaction schema
 */
const TransactionSchema = new Schema<ITransaction>(
  {
    reference: {
      type: String,
      required: [true, 'Transaction reference is required'],
      unique: true,
      trim: true
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      validate: {
        validator: function(value: number) {
          return value !== 0;
        },
        message: 'Amount cannot be zero'
      }
    },
    currency: {
      type: String,
      required: [true, 'Currency is required'],
      default: 'USD',
      uppercase: true,
      minlength: 3,
      maxlength: 3
    },
    type: {
      type: String,
      enum: Object.values(TransactionType),
      required: [true, 'Transaction type is required']
    },
    status: {
      type: String,
      enum: Object.values(TransactionStatus),
      default: TransactionStatus.PENDING
    },
    statusHistory: [
      {
        status: {
          type: String,
          enum: Object.values(TransactionStatus),
          required: true
        },
        timestamp: {
          type: Date,
          default: Date.now
        },
        note: String,
        changedBy: {
          type: Schema.Types.ObjectId,
          ref: 'User'
        }
      }
    ],
    description: {
      type: String,
      required: [true, 'Description is required']
    },
    agent: {
      type: Schema.Types.ObjectId,
      ref: 'Agent'
    },
    client: {
      type: Schema.Types.ObjectId,
      ref: 'Client'
    },
    paymentMethod: {
      type: Schema.Types.ObjectId,
      ref: 'PaymentMethod'
    },
    commissionCalculation: {
      type: Schema.Types.ObjectId,
      ref: 'CommissionCalculation'
    },
    relatedTransactions: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Transaction'
      }
    ],
    stripePaymentIntentId: {
      type: String
    },
    stripeTransferId: {
      type: String
    },
    externalReference: {
      type: String
    },
    metadata: {
      type: Schema.Types.Mixed
    },
    notes: {
      type: String
    }
  },
  {
    timestamps: true
  }
);

// Create indexes for common queries
TransactionSchema.index({ reference: 1 }, { unique: true });
TransactionSchema.index({ agent: 1 });
TransactionSchema.index({ client: 1 });
TransactionSchema.index({ status: 1 });
TransactionSchema.index({ type: 1 });
TransactionSchema.index({ createdAt: 1 });
TransactionSchema.index({ stripePaymentIntentId: 1 });

// Compound index for filtering transactions by agent and date
TransactionSchema.index({ agent: 1, createdAt: 1 });

// Compound index for filtering transactions by client and date
TransactionSchema.index({ client: 1, createdAt: 1 });

// Method to update status with history tracking
TransactionSchema.methods.updateStatus = async function(
  this: ITransaction,
  status: TransactionStatus,
  note?: string,
  changedBy?: mongoose.Types.ObjectId
): Promise<void> {
  // Only update if status is different
  if (this.status !== status) {
    this.status = status;
    
    // Add to status history
    this.statusHistory.push({
      status,
      timestamp: new Date(),
      note,
      changedBy
    });
    
    await this.save();
  }
};

// Method to add a related transaction
TransactionSchema.methods.addRelatedTransaction = async function(
  this: ITransaction,
  transactionId: mongoose.Types.ObjectId
): Promise<void> {
  // Check if the transaction is already related
  if (!this.relatedTransactions) {
    this.relatedTransactions = [];
  }
  
  if (!this.relatedTransactions.some(id => id.toString() === transactionId.toString())) {
    this.relatedTransactions.push(transactionId);
    await this.save();
  }
};

// Pre-save hook to ensure status history is initialized
TransactionSchema.pre('save', function(this: ITransaction, next) {
  // If this is a new document and statusHistory is empty, initialize it
  if (this.isNew && (!this.statusHistory || this.statusHistory.length === 0)) {
    this.statusHistory = [{
      status: this.status,
      timestamp: new Date()
    }];
  }
  next();
});

// Generate a unique reference number if not provided
TransactionSchema.pre('save', async function(this: ITransaction, next) {
  if (this.isNew && !this.reference) {
    // Generate a unique reference with format: TR-YYYYMMDD-RANDOMCHARS
    const date = new Date();
    const datePart = date.toISOString().slice(0, 10).replace(/-/g, '');
    const randomPart = Math.random().toString(36).substring(2, 10).toUpperCase();
    this.reference = `TR-${datePart}-${randomPart}`;
    
    // Ensure reference is unique
    try {
      const existingTransaction = await mongoose.model('Transaction').findOne({
        reference: this.reference
      });
      
      if (existingTransaction) {
        // If reference already exists, try again with a different random part
        return this.save();
      }
    } catch (err) {
      return next(err);
    }
  }
  next();
});

// Export the model
const Transaction = mongoose.model<ITransaction>('Transaction', TransactionSchema);

export default Transaction; 