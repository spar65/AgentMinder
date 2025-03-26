import express from 'express';
import * as agentController from '../controllers/agentController';

const router = express.Router();

// GET all agents
router.get('/', agentController.getAgents);

// GET single agent by ID
router.get('/:id', agentController.getAgentById);

// POST create new agent
router.post('/', agentController.createAgent);

// PUT update agent
router.put('/:id', agentController.updateAgent);

// PATCH update agent status
router.patch('/:id/status', agentController.updateAgentStatus);

// DELETE agent
router.delete('/:id', agentController.deleteAgent);

// GET agent team members
router.get('/:id/team', agentController.getAgentTeam);

// GET agent supervisors chain
router.get('/:id/supervisors', agentController.getAgentSupervisors);

// GET agent payments
router.get('/:id/payments', agentController.getAgentPayments);

export default router; 