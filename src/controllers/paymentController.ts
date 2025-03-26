import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import Payment, { PaymentStatus } from '../models/Payment';
import Agent from '../models/Agent';
import { ApiError } from '../middleware/errorHandler';
import { createLogger } from '../utils/logger';

const logger = createLogger();

/**
 * Get all payments with filtering, sorting, and pagination
 * @route GET /api/payments
 */
export const getPayments = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Parse query parameters
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;
    const sort = (req.query.sort as string) || '-createdAt';
    
    // Build filter object
    const filter: Record<string, unknown> = {};
    
    if (req.query.status) {
      filter.status = req.query.status;
    }
    
    if (req.query.type) {
      filter.type = req.query.type;
    }

    if (req.query.agent) {
      // Validate agent ObjectId
      if (!mongoose.Types.ObjectId.isValid(req.query.agent as string)) {
        throw new ApiError('Invalid agent ID', 400);
      }
      filter.agent = req.query.agent;
    }

    // Execute query with pagination
    const payments = await Payment.find(filter)
      .populate('agent', 'firstName lastName email')
      .sort(sort)
      .skip(skip)
      .limit(limit);
    
    // Get total count for pagination metadata
    const totalPayments = await Payment.countDocuments(filter);
    
    res.status(200).json({
      success: true,
      count: payments.length,
      pagination: {
        current: page,
        limit,
        total: Math.ceil(totalPayments / limit),
        totalRecords: totalPayments
      },
      data: payments
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single payment by ID
 * @route GET /api/payments/:id
 */
export const getPaymentById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ApiError('Invalid payment ID', 400);
    }
    
    const payment = await Payment.findById(id).populate('agent', 'firstName lastName email');
    
    if (!payment) {
      throw new ApiError('Payment not found', 404);
    }
    
    res.status(200).json({
      success: true,
      data: payment
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create new payment
 * @route POST /api/payments
 */
export const createPayment = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { agent } = req.body;
    
    // Validate agent ObjectId
    if (!mongoose.Types.ObjectId.isValid(agent)) {
      throw new ApiError('Invalid agent ID', 400);
    }
    
    // Check if agent exists
    const agentExists = await Agent.findById(agent);
    
    if (!agentExists) {
      throw new ApiError('Agent not found', 404);
    }
    
    // Create new payment
    const payment = await Payment.create(req.body);
    
    logger.info(`New payment created: ${payment._id} for agent: ${agent}`);
    
    res.status(201).json({
      success: true,
      data: payment
    });
  } catch (error) {
    // Handle validation errors
    if (error instanceof mongoose.Error.ValidationError) {
      const messages = Object.values(error.errors).map(err => err.message);
      next(new ApiError(messages.join(', '), 400));
    } else {
      next(error);
    }
  }
};

/**
 * Update payment
 * @route PUT /api/payments/:id
 */
export const updatePayment = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ApiError('Invalid payment ID', 400);
    }
    
    // Check if trying to update status - should use the specific endpoint
    if (req.body.status) {
      throw new ApiError('Use PATCH /api/payments/:id/status to update status', 400);
    }
    
    // Don't allow updating the agent
    if (req.body.agent) {
      throw new ApiError('Cannot change agent association', 400);
    }
    
    // Find and update payment
    const payment = await Payment.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true
    });
    
    if (!payment) {
      throw new ApiError('Payment not found', 404);
    }
    
    logger.info(`Payment updated: ${id}`);
    
    res.status(200).json({
      success: true,
      data: payment
    });
  } catch (error) {
    // Handle validation errors
    if (error instanceof mongoose.Error.ValidationError) {
      const messages = Object.values(error.errors).map(err => err.message);
      next(new ApiError(messages.join(', '), 400));
    } else {
      next(error);
    }
  }
};

/**
 * Update payment status
 * @route PATCH /api/payments/:id/status
 */
export const updatePaymentStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ApiError('Invalid payment ID', 400);
    }
    
    // Validate status
    if (!status || !Object.values(PaymentStatus).includes(status as PaymentStatus)) {
      throw new ApiError('Invalid status value', 400);
    }
    
    // Find and update payment status
    const payment = await Payment.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true }
    );
    
    if (!payment) {
      throw new ApiError('Payment not found', 404);
    }
    
    logger.info(`Payment status updated: ${id} - ${status}`);
    
    res.status(200).json({
      success: true,
      data: payment
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete payment
 * @route DELETE /api/payments/:id
 */
export const deletePayment = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ApiError('Invalid payment ID', 400);
    }
    
    const payment = await Payment.findById(id);
    
    if (!payment) {
      throw new ApiError('Payment not found', 404);
    }
    
    // Don't allow deleting completed payments
    if (payment.status === PaymentStatus.COMPLETED) {
      throw new ApiError('Cannot delete completed payments', 400);
    }
    
    await payment.deleteOne();
    
    logger.info(`Payment deleted: ${id}`);
    
    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Process a payment (simulating payment gateway integration)
 * @route POST /api/payments/:id/process
 */
export const processPayment = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ApiError('Invalid payment ID', 400);
    }
    
    // Find payment
    const payment = await Payment.findById(id);
    
    if (!payment) {
      throw new ApiError('Payment not found', 404);
    }
    
    // Check if payment is already processed
    if (payment.status === PaymentStatus.COMPLETED) {
      throw new ApiError('Payment already processed', 400);
    }
    
    // Simulate payment processing
    logger.info(`Processing payment: ${id}`);
    
    // Update to processing status
    payment.status = PaymentStatus.PROCESSING;
    await payment.save();
    
    try {
      // Simulate payment gateway call
      logger.info('Calling payment gateway API...');
      
      // Generate a fake transaction ID
      const transactionId = `TRX-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      
      // Update payment with transaction details
      payment.status = PaymentStatus.COMPLETED;
      payment.transactionId = transactionId;
      payment.processingDate = new Date();
      await payment.save();
      
      logger.info(`Payment processed successfully: ${id}, Transaction ID: ${transactionId}`);
      
      res.status(200).json({
        success: true,
        message: 'Payment processed successfully',
        data: payment
      });
    } catch (processingError) {
      // Update payment to failed status in case of error
      payment.status = PaymentStatus.FAILED;
      await payment.save();
      
      logger.error(`Payment processing failed: ${id}`, { error: processingError });
      
      throw new ApiError('Payment processing failed', 500);
    }
  } catch (error) {
    next(error);
  }
}; 