import mongoose, { Document, Schema } from 'mongoose';
import { mongooseLogger } from '../utils/mongooseLogger';

/**
 * Transaction event type enum
 */
export enum TransactionEventType {
  CREATED = 'created',
  STATUS_CHANGED = 'status_changed',
  MODIFIED = 'modified',
  NOTE_ADDED = 'note_added',
  DOCUMENT_LINKED = 'document_linked',
  PAYMENT_ATTEMPTED = 'payment_attempted',
  PAYMENT_SUCCESS = 'payment_success',
  PAYMENT_FAILED = 'payment_failed',
  REFUND_INITIATED = 'refund_initiated',
  REFUND_COMPLETED = 'refund_completed'
}

/**
 * Transaction event document interface
 */
export interface ITransactionEvent extends Document {
  transaction: mongoose.Types.ObjectId;
  type: TransactionEventType;
  data: Record<string, unknown>;
  user?: mongoose.Types.ObjectId;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Transaction event schema
 */
const TransactionEventSchema = new Schema<ITransactionEvent>(
  {
    transaction: {
      type: Schema.Types.ObjectId,
      ref: 'Transaction',
      required: [true, 'Transaction is required'],
      index: true
    },
    type: {
      type: String,
      enum: Object.values(TransactionEventType),
      required: [true, 'Event type is required']
    },
    data: {
      type: Schema.Types.Mixed,
      required: [true, 'Event data is required']
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    ipAddress: {
      type: String
    },
    userAgent: {
      type: String
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

// Create indexes for common queries
TransactionEventSchema.index({ transaction: 1, timestamp: 1 });
TransactionEventSchema.index({ type: 1 });
TransactionEventSchema.index({ user: 1 });
TransactionEventSchema.index({ timestamp: 1 });

// Add logging plugin
TransactionEventSchema.plugin(mongooseLogger);

/**
 * Static method to create a status change event
 */
TransactionEventSchema.statics.createStatusChangeEvent = async function(
  transactionId: mongoose.Types.ObjectId,
  oldStatus: string,
  newStatus: string,
  user?: mongoose.Types.ObjectId,
  ipAddress?: string,
  userAgent?: string
): Promise<ITransactionEvent> {
  return this.create({
    transaction: transactionId,
    type: TransactionEventType.STATUS_CHANGED,
    data: {
      oldStatus,
      newStatus
    },
    user,
    ipAddress,
    userAgent,
    timestamp: new Date()
  });
};

/**
 * Static method to create a note added event
 */
TransactionEventSchema.statics.createNoteEvent = async function(
  transactionId: mongoose.Types.ObjectId,
  note: string,
  user?: mongoose.Types.ObjectId,
  ipAddress?: string,
  userAgent?: string
): Promise<ITransactionEvent> {
  return this.create({
    transaction: transactionId,
    type: TransactionEventType.NOTE_ADDED,
    data: {
      note
    },
    user,
    ipAddress,
    userAgent,
    timestamp: new Date()
  });
};

/**
 * Static method to create a modified event
 */
TransactionEventSchema.statics.createModifiedEvent = async function(
  transactionId: mongoose.Types.ObjectId,
  changes: Record<string, { oldValue: unknown; newValue: unknown }>,
  user?: mongoose.Types.ObjectId,
  ipAddress?: string,
  userAgent?: string
): Promise<ITransactionEvent> {
  return this.create({
    transaction: transactionId,
    type: TransactionEventType.MODIFIED,
    data: {
      changes
    },
    user,
    ipAddress,
    userAgent,
    timestamp: new Date()
  });
};

/**
 * Static method to get events for a transaction
 */
TransactionEventSchema.statics.getTransactionEvents = async function(
  transactionId: mongoose.Types.ObjectId,
  limit?: number,
  types?: TransactionEventType[]
): Promise<ITransactionEvent[]> {
  const query: Record<string, unknown> = { transaction: transactionId };
  
  if (types && types.length > 0) {
    query.type = { $in: types };
  }
  
  let eventQuery = this.find(query).sort({ timestamp: -1 });
  
  if (limit) {
    eventQuery = eventQuery.limit(limit);
  }
  
  return eventQuery;
};

// Export the model
const TransactionEvent = mongoose.model<ITransactionEvent>(
  'TransactionEvent',
  TransactionEventSchema
);

export default TransactionEvent; 