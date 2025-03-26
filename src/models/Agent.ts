import mongoose, { Document, Schema } from 'mongoose';

/**
 * Agent status enum
 */
export enum AgentStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  PENDING = 'pending'
}

/**
 * Status change history interface
 */
export interface StatusHistory {
  status: AgentStatus;
  timestamp: Date;
  reason?: string;
  changedBy?: mongoose.Types.ObjectId;
}

/**
 * Agent document interface
 */
export interface IAgent extends Document {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  status: AgentStatus;
  statusHistory: StatusHistory[];
  joinDate: Date;
  commissionRate: number;
  supervisor?: mongoose.Types.ObjectId;
  team?: mongoose.Types.ObjectId[];
  level?: number;
  specializations: string[];
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  bankDetails?: {
    accountName: string;
    accountNumber: string;
    bankName: string;
    routingNumber: string;
  };
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  
  // Virtual properties
  fullName: string;
  
  // Methods
  getTeamMembers(): Promise<IAgent[]>;
  getSupervisorChain(): Promise<IAgent[]>;
  updateStatus(status: AgentStatus, reason?: string, changedBy?: mongoose.Types.ObjectId): Promise<void>;
}

/**
 * Agent schema
 */
const AgentSchema = new Schema<IAgent>(
  {
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please add a valid email'],
    },
    phoneNumber: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
    },
    status: {
      type: String,
      enum: Object.values(AgentStatus),
      default: AgentStatus.PENDING,
    },
    statusHistory: [
      {
        status: {
          type: String,
          enum: Object.values(AgentStatus),
          required: true
        },
        timestamp: {
          type: Date,
          default: Date.now
        },
        reason: String,
        changedBy: {
          type: Schema.Types.ObjectId,
          ref: 'User'
        }
      }
    ],
    joinDate: {
      type: Date,
      default: Date.now,
    },
    commissionRate: {
      type: Number,
      required: [true, 'Commission rate is required'],
      min: [0, 'Commission rate cannot be negative'],
      max: [100, 'Commission rate cannot exceed 100%'],
    },
    supervisor: {
      type: Schema.Types.ObjectId,
      ref: 'Agent'
    },
    team: [{
      type: Schema.Types.ObjectId,
      ref: 'Agent'
    }],
    level: {
      type: Number,
      default: 1,
      min: 1
    },
    specializations: [String],
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String,
    },
    bankDetails: {
      accountName: String,
      accountNumber: String,
      bankName: String,
      routingNumber: String,
    },
    notes: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Create a compound index on first and last name for efficient searches
AgentSchema.index({ firstName: 1, lastName: 1 });

// Create index on status for filtering
AgentSchema.index({ status: 1 });

// Create index on supervisor for team hierarchy queries
AgentSchema.index({ supervisor: 1 });

// Create a text index for searching agents
AgentSchema.index(
  { firstName: 'text', lastName: 'text', email: 'text', specializations: 'text' },
  { name: 'agent_text_index' }
);

// Virtual for fullName
AgentSchema.virtual('fullName').get(function (this: IAgent) {
  return `${this.firstName} ${this.lastName}`;
});

// Method to get all team members
AgentSchema.methods.getTeamMembers = async function(this: IAgent): Promise<IAgent[]> {
  return await mongoose.model('Agent').find({ supervisor: this._id });
};

// Method to get supervisor chain (all supervisors up to the top)
AgentSchema.methods.getSupervisorChain = async function(this: IAgent): Promise<IAgent[]> {
  const supervisors: IAgent[] = [];
  let currentAgent: IAgent | null = this;
  
  while (currentAgent && currentAgent.supervisor) {
    const supervisor = await mongoose.model('Agent').findById(currentAgent.supervisor);
    if (!supervisor || supervisors.some(s => s._id.toString() === supervisor._id.toString())) {
      // Prevent circular references
      break;
    }
    supervisors.push(supervisor);
    currentAgent = supervisor;
  }
  
  return supervisors;
};

// Method to update status with history tracking
AgentSchema.methods.updateStatus = async function(
  this: IAgent,
  status: AgentStatus,
  reason?: string,
  changedBy?: mongoose.Types.ObjectId
): Promise<void> {
  // Only update if status is different
  if (this.status !== status) {
    this.status = status;
    
    // Add to status history
    this.statusHistory.push({
      status,
      timestamp: new Date(),
      reason,
      changedBy
    });
    
    await this.save();
  }
};

// Pre-save hook to ensure status history is initialized
AgentSchema.pre('save', function(this: IAgent, next) {
  // If this is a new document and statusHistory is empty, initialize it
  if (this.isNew && (!this.statusHistory || this.statusHistory.length === 0)) {
    this.statusHistory = [{
      status: this.status,
      timestamp: new Date()
    }];
  }
  next();
});

// Pre-validate hook to prevent circular supervisor references
AgentSchema.pre('validate', async function(this: IAgent, next) {
  if (this.supervisor && this.supervisor.toString() === this._id.toString()) {
    const err = new Error('An agent cannot be their own supervisor');
    return next(err);
  }
  
  // Check for circular references in supervision chain
  if (this.supervisor) {
    let currentSupervisor = await mongoose.model('Agent').findById(this.supervisor);
    const visitedSupervisors = new Set<string>([this._id.toString()]);
    
    while (currentSupervisor) {
      const supervisorId = currentSupervisor._id.toString();
      
      if (visitedSupervisors.has(supervisorId)) {
        const err = new Error('Circular supervision chain detected');
        return next(err);
      }
      
      visitedSupervisors.add(supervisorId);
      
      if (!currentSupervisor.supervisor) break;
      currentSupervisor = await mongoose.model('Agent').findById(currentSupervisor.supervisor);
    }
  }
  
  next();
});

// Export the model
const Agent = mongoose.model<IAgent>('Agent', AgentSchema);

export default Agent; 