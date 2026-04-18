import { Router } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';
import { BusinessService } from '../services/business.service';

const router = Router({ mergeParams: true });
const businessService = new BusinessService();
router.use(authMiddleware);

router.get('/', async (req: AuthRequest, res) => {
  try {
    const users = await businessService.listUsers(req.params.bizId);
    res.json({ success: true, data: users });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

router.post('/invite', async (req: AuthRequest, res) => {
  try {
    const { user_uuid, role } = req.body;
    if (!user_uuid || !role) {
      return res.status(400).json({ success: false, error: 'user_uuid and role required' });
    }
    const membership = await businessService.inviteUser(req.params.bizId, user_uuid, role);
    res.status(201).json({ success: true, data: membership });
  } catch (err) {
    res.status(400).json({ success: false, error: (err as Error).message });
  }
});

router.put('/:userId/role', async (req: AuthRequest, res) => {
  try {
    const { role } = req.body;
    if (!role) {
      return res.status(400).json({ success: false, error: 'Role required' });
    }
    await businessService.changeRole(req.params.bizId, req.params.userId, role);
    res.json({ success: true, data: { message: 'Role updated' } });
  } catch (err) {
    res.status(400).json({ success: false, error: (err as Error).message });
  }
});

router.delete('/:userId', async (req: AuthRequest, res) => {
  try {
    await businessService.removeUser(req.params.bizId, req.params.userId);
    res.json({ success: true, data: { message: 'User removed' } });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

export default router;
