import { Router } from 'express';
import { CouchDbService } from '../services/couchdb.service';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';

const router = Router();
const couchDbService = new CouchDbService();

// GET /api/v1/sync/credentials — returns CouchDB sync credentials for the authenticated user
router.get('/credentials', authMiddleware, (req, res) => {
  try {
    const userUuid = (req as AuthRequest).user?.uuid;
    if (!userUuid) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }

    const credentials = couchDbService.getSyncCredentials(userUuid);
    res.json({ success: true, data: credentials });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

export default router;
