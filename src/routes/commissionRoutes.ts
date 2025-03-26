import express from 'express';
import * as commissionController from '../controllers/commissionController';

const router = express.Router();

// GET all commission calculations
router.get('/', commissionController.getCommissions);

// GET single commission calculation by ID
router.get('/:id', commissionController.getCommissionById);

// POST calculate commission
router.post('/calculate', commissionController.calculateCommission);

// POST apply adjustment to commission
router.post('/:id/adjustments', commissionController.applyAdjustment);

// PATCH approve commission
router.patch('/:id/approve', commissionController.approveCommission);

// PATCH mark commission as paid
router.patch('/:id/pay', commissionController.markAsPaid);

// GET agent commission statistics
router.get('/agent/:agentId/stats', commissionController.getAgentCommissionStats);

export default router; 