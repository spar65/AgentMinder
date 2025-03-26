import express, { Router } from 'express';
import agentRoutes from './agentRoutes';
import paymentRoutes from './paymentRoutes';
import commissionRoutes from './commissionRoutes';

// Create API router
const apiRouter = express.Router();

// Version 1 routes
const v1Router = Router();
apiRouter.use('/v1', v1Router);

// Register all v1 routes
v1Router.use('/agents', agentRoutes);
v1Router.use('/payments', paymentRoutes);
v1Router.use('/commissions', commissionRoutes);

// Default to latest version for /api/* routes
apiRouter.use('/agents', agentRoutes);
apiRouter.use('/payments', paymentRoutes);
apiRouter.use('/commissions', commissionRoutes);

export default apiRouter; 