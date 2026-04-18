import { Router } from 'express';
import authRoutes from './auth.routes';
import businessRoutes from './business.routes';
import userRoutes from './user.routes';
import syncRoutes from './sync.routes';

const router = Router();

// Public
router.use('/auth', authRoutes);

// Authenticated
router.use('/businesses', businessRoutes);
router.use('/sync', syncRoutes);

// Business-scoped
router.use('/businesses/:bizId/users', userRoutes);

export default router;
