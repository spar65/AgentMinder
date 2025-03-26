import express from 'express';
import * as paymentController from '../controllers/paymentController';

const router = express.Router();

// GET all payments
router.get('/', paymentController.getPayments);

// GET single payment by ID
router.get('/:id', paymentController.getPaymentById);

// POST create new payment
router.post('/', paymentController.createPayment);

// PUT update payment
router.put('/:id', paymentController.updatePayment);

// PATCH update payment status
router.patch('/:id/status', paymentController.updatePaymentStatus);

// DELETE payment
router.delete('/:id', paymentController.deletePayment);

// POST process payment
router.post('/:id/process', paymentController.processPayment);

export default router; 