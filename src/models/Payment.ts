import mongoose, { Document, Schema } from 'mongoose';
import { mongooseLogger } from '../utils/mongooseLogger';

/**
 * Payment status enum
 */
export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded'
}

/**
 * Payment type enum
 */
export enum PaymentType {
  COMMISSION = 'commission',
  BONUS = 'bonus',
  REFUND = 'refund',
  ADJUSTMENT = 'adjustment'
}

/**
 * Payment document interface
 */
export interface IPayment extends Document {
  agent: mongoose.Types.ObjectId;
  amount: number;
  type: PaymentType;
  status: PaymentStatus;
  description: string;
  transactionId?: string;
  processingDate?: Date;
  paymentMethod?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Payment schema
 */
const PaymentSchema = new Schema<IPayment>(
  {
    agent: {
      type: Schema.Types.ObjectId,
      ref: 'Agent',
      required: [true, 'Agent is required'],
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
    },
    type: {
      type: String,
      enum: Object.values(PaymentType),
      required: [true, 'Payment type is required'],
    },
    status: {
      type: String,
      enum: Object.values(PaymentStatus),
      default: PaymentStatus.PENDING,
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
    },
    transactionId: {
      type: String,
    },
    processingDate: {
      type: Date,
    },
    paymentMethod: {
      type: String,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

// Create indexes for common queries
PaymentSchema.index({ agent: 1 });
PaymentSchema.index({ status: 1 });
PaymentSchema.index({ type: 1 });
PaymentSchema.index({ createdAt: 1 });

// Add logging plugin
PaymentSchema.plugin(mongooseLogger);

// Export the model
const Payment = mongoose.model<IPayment>('Payment', PaymentSchema);

export default Payment; 