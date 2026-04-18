import { Router } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';
import { BusinessService } from '../services/business.service';

const router = Router();
const businessService = new BusinessService();
router.use(authMiddleware);

router.get('/', async (req: AuthRequest, res) => {
  try {
    const businesses = await businessService.listForUser(req.user!.uuid);
    res.json({ success: true, data: businesses });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

router.post('/', async (req: AuthRequest, res) => {
  try {
    const business = await businessService.create(req.user!.uuid, req.body);
    res.status(201).json({ success: true, data: business });
  } catch (err) {
    res.status(400).json({ success: false, error: (err as Error).message });
  }
});

router.get('/:bizId', async (req: AuthRequest, res) => {
  try {
    const business = await businessService.getById(req.params.bizId);
    if (!business) {
      return res.status(404).json({ success: false, error: 'Business not found' });
    }
    res.json({ success: true, data: business });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

router.put('/:bizId', async (req: AuthRequest, res) => {
  try {
    const business = await businessService.update(req.params.bizId, req.body);
    res.json({ success: true, data: business });
  } catch (err) {
    res.status(400).json({ success: false, error: (err as Error).message });
  }
});

router.delete('/:bizId', async (req: AuthRequest, res) => {
  try {
    await businessService.delete(req.params.bizId);
    res.json({ success: true, data: { message: 'Deleted' } });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

export default router;
