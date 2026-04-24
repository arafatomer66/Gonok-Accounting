import { Router } from 'express';
import authRoutes from './auth.routes';
import businessRoutes from './business.routes';
import userRoutes from './user.routes';
import syncRoutes from './sync.routes';
import storefrontRoutes from './storefront.routes';
import uploadRoutes from './upload.routes';

const router = Router();

// Public
router.use('/auth', authRoutes);
router.use('/storefront', storefrontRoutes);

// Authenticated
router.use('/businesses', businessRoutes);
router.use('/sync', syncRoutes);
router.use('/upload', uploadRoutes);

// Business-scoped
router.use('/businesses/:bizId/users', userRoutes);

export default router;
