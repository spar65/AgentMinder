import Joi from 'joi';
import { AgentStatus } from '../models/Agent';
import { CommissionStatus } from '../models/CommissionCalculation';
import { PaymentMethodStatus, PaymentMethodType } from '../models/PaymentMethod';
import { TransactionStatus, TransactionType } from '../models/Transaction';
import { TimePeriod } from '../models/PerformanceMetric';

// Helper function to create an object ID schema
const objectId = Joi.string().pattern(/^[0-9a-fA-F]{24}$/);

// Agent validation schemas
export const agentSchema = {
  create: Joi.object({
    firstName: Joi.string().min(2).max(50).required(),
    lastName: Joi.string().min(2).max(50).required(),
    email: Joi.string().email().required(),
    phoneNumber: Joi.string().pattern(/^\+?[1-9]\d{9,14}$/).required(),
    status: Joi.string().valid(...Object.values(AgentStatus)),
    commissionRate: Joi.number().min(0).max(100).required(),
    supervisor: objectId,
    specializations: Joi.array().items(Joi.string()),
    address: Joi.object({
      street: Joi.string(),
      city: Joi.string(),
      state: Joi.string(),
      zipCode: Joi.string(),
      country: Joi.string()
    }),
    bankDetails: Joi.object({
      accountName: Joi.string(),
      accountNumber: Joi.string(),
      bankName: Joi.string(),
      routingNumber: Joi.string()
    }),
    notes: Joi.string()
  }),
  
  update: Joi.object({
    firstName: Joi.string().min(2).max(50),
    lastName: Joi.string().min(2).max(50),
    email: Joi.string().email(),
    phoneNumber: Joi.string().pattern(/^\+?[1-9]\d{9,14}$/),
    status: Joi.string().valid(...Object.values(AgentStatus)),
    commissionRate: Joi.number().min(0).max(100),
    supervisor: objectId,
    specializations: Joi.array().items(Joi.string()),
    address: Joi.object({
      street: Joi.string(),
      city: Joi.string(),
      state: Joi.string(),
      zipCode: Joi.string(),
      country: Joi.string()
    }),
    bankDetails: Joi.object({
      accountName: Joi.string(),
      accountNumber: Joi.string(),
      bankName: Joi.string(),
      routingNumber: Joi.string()
    }),
    notes: Joi.string()
  }),
  
  updateStatus: Joi.object({
    status: Joi.string().valid(...Object.values(AgentStatus)).required(),
    reason: Joi.string()
  })
};

// Commission Structure validation schemas
export const commissionStructureSchema = {
  create: Joi.object({
    name: Joi.string().min(3).max(100).required(),
    agent: objectId,
    isDefault: Joi.boolean(),
    baseRate: Joi.number().min(0).max(100).required(),
    tiers: Joi.array().items(
      Joi.object({
        threshold: Joi.number().min(0).required(),
        rate: Joi.number().min(0).max(100).required()
      })
    ),
    bonusRules: Joi.array().items(
      Joi.object({
        type: Joi.string().valid('newClient', 'retention', 'upsell').required(),
        amount: Joi.number().min(0).required(),
        description: Joi.string()
      })
    ),
    effectiveDate: Joi.date().default(Date.now),
    expirationDate: Joi.date().greater(Joi.ref('effectiveDate')),
    notes: Joi.string()
  }),
  
  update: Joi.object({
    name: Joi.string().min(3).max(100),
    isDefault: Joi.boolean(),
    baseRate: Joi.number().min(0).max(100),
    tiers: Joi.array().items(
      Joi.object({
        threshold: Joi.number().min(0).required(),
        rate: Joi.number().min(0).max(100).required()
      })
    ),
    bonusRules: Joi.array().items(
      Joi.object({
        type: Joi.string().valid('newClient', 'retention', 'upsell').required(),
        amount: Joi.number().min(0).required(),
        description: Joi.string()
      })
    ),
    expirationDate: Joi.date(),
    notes: Joi.string()
  })
};

// Performance Metric validation schemas
export const performanceMetricSchema = {
  create: Joi.object({
    agent: objectId.required(),
    period: Joi.string().required(),
    periodType: Joi.string().valid(...Object.values(TimePeriod)).required(),
    salesVolume: Joi.number().min(0),
    transactionCount: Joi.number().min(0),
    clientAcquisitions: Joi.number().min(0),
    retentionRate: Joi.number().min(0).max(100),
    avgResponseTime: Joi.number().min(0),
    goals: Joi.object({
      salesVolume: Joi.number().min(0),
      transactionCount: Joi.number().min(0),
      clientAcquisitions: Joi.number().min(0),
      retentionRate: Joi.number().min(0).max(100)
    }),
    notes: Joi.string()
  }),
  
  update: Joi.object({
    salesVolume: Joi.number().min(0),
    transactionCount: Joi.number().min(0),
    clientAcquisitions: Joi.number().min(0),
    retentionRate: Joi.number().min(0).max(100),
    avgResponseTime: Joi.number().min(0),
    goals: Joi.object({
      salesVolume: Joi.number().min(0),
      transactionCount: Joi.number().min(0),
      clientAcquisitions: Joi.number().min(0),
      retentionRate: Joi.number().min(0).max(100)
    }),
    notes: Joi.string()
  })
};

// Payment Method validation schemas
export const paymentMethodSchema = {
  create: Joi.object({
    owner: objectId.required(),
    ownerType: Joi.string().valid('Agent', 'Client').required(),
    stripeCustomerId: Joi.string(),
    stripePaymentMethodId: Joi.string(),
    type: Joi.string().valid(...Object.values(PaymentMethodType)).required(),
    status: Joi.string().valid(...Object.values(PaymentMethodStatus)),
    isDefault: Joi.boolean(),
    last4: Joi.string().length(4),
    expiryMonth: Joi.number().integer().min(1).max(12),
    expiryYear: Joi.number().integer().min(2000),
    brand: Joi.string(),
    bankName: Joi.string(),
    country: Joi.string().length(2),
    metadata: Joi.object()
  }),
  
  update: Joi.object({
    status: Joi.string().valid(...Object.values(PaymentMethodStatus)),
    isDefault: Joi.boolean(),
    metadata: Joi.object()
  })
};

// Transaction validation schemas
export const transactionSchema = {
  create: Joi.object({
    reference: Joi.string(),
    amount: Joi.number().required().invalid(0),
    currency: Joi.string().length(3).uppercase().default('USD'),
    type: Joi.string().valid(...Object.values(TransactionType)).required(),
    status: Joi.string().valid(...Object.values(TransactionStatus)),
    description: Joi.string().required(),
    agent: objectId,
    client: objectId,
    paymentMethod: objectId,
    commissionCalculation: objectId,
    relatedTransactions: Joi.array().items(objectId),
    stripePaymentIntentId: Joi.string(),
    stripeTransferId: Joi.string(),
    externalReference: Joi.string(),
    metadata: Joi.object(),
    notes: Joi.string()
  }).or('agent', 'client'),
  
  update: Joi.object({
    status: Joi.string().valid(...Object.values(TransactionStatus)),
    description: Joi.string(),
    paymentMethod: objectId,
    stripePaymentIntentId: Joi.string(),
    stripeTransferId: Joi.string(),
    externalReference: Joi.string(),
    metadata: Joi.object(),
    notes: Joi.string()
  }),
  
  updateStatus: Joi.object({
    status: Joi.string().valid(...Object.values(TransactionStatus)).required(),
    note: Joi.string()
  })
};

// Commission Calculation validation schemas
export const commissionCalculationSchema = {
  create: Joi.object({
    agent: objectId.required(),
    transaction: objectId.required(),
    commissionStructure: objectId.required(),
    baseAmount: Joi.number().min(0).required(),
    rate: Joi.number().min(0).max(100).required(),
    adjustments: Joi.array().items(
      Joi.object({
        reason: Joi.string().required(),
        amount: Joi.number().required(),
        description: Joi.string()
      })
    ),
    finalAmount: Joi.number().min(0),
    status: Joi.string().valid(...Object.values(CommissionStatus)),
    notes: Joi.string()
  }),
  
  update: Joi.object({
    status: Joi.string().valid(...Object.values(CommissionStatus)),
    notes: Joi.string()
  }),
  
  addAdjustment: Joi.object({
    reason: Joi.string().required(),
    amount: Joi.number().required(),
    description: Joi.string()
  })
};

// Search validation schemas
export const searchSchema = {
  agent: Joi.object({
    query: Joi.string(),
    status: Joi.string().valid(...Object.values(AgentStatus)),
    supervisor: objectId,
    specialization: Joi.string(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    sortBy: Joi.string(),
    sortOrder: Joi.string().valid('asc', 'desc').default('asc')
  }),
  
  transaction: Joi.object({
    query: Joi.string(),
    status: Joi.string().valid(...Object.values(TransactionStatus)),
    type: Joi.string().valid(...Object.values(TransactionType)),
    agent: objectId,
    client: objectId,
    dateFrom: Joi.date(),
    dateTo: Joi.date().min(Joi.ref('dateFrom')),
    minAmount: Joi.number(),
    maxAmount: Joi.number().min(Joi.ref('minAmount')),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    sortBy: Joi.string(),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc')
  })
}; 