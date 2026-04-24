import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { AuthService } from '../services/auth.service';

const router = Router();
const authService = new AuthService();

// Strict rate limiting on auth endpoints to prevent OTP brute force
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many attempts, please try again after 15 minutes' },
});

// Stricter limit on OTP verification (5 attempts per 15 min)
const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many OTP attempts, please try again after 15 minutes' },
});

router.post('/register', authLimiter, async (req, res) => {
  try {
    const { phone, name } = req.body;
    if (!phone || !name) {
      return res.status(400).json({ success: false, error: 'Phone and name required' });
    }
    const result = await authService.register(phone, name);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, error: (err as Error).message });
  }
});

router.post('/login', authLimiter, async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) {
      return res.status(400).json({ success: false, error: 'Phone required' });
    }
    const result = await authService.login(phone);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, error: (err as Error).message });
  }
});

router.post('/verify-otp', otpLimiter, async (req, res) => {
  try {
    const { phone, otp } = req.body;
    if (!phone || !otp) {
      return res.status(400).json({ success: false, error: 'Phone and OTP required' });
    }
    const result = await authService.verifyOtp(phone, otp);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, error: (err as Error).message });
  }
});

router.post('/refresh-token', authLimiter, async (req, res) => {
  try {
    const { refresh_token } = req.body;
    if (!refresh_token) {
      return res.status(400).json({ success: false, error: 'Refresh token required' });
    }
    const result = await authService.refreshToken(refresh_token);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(401).json({ success: false, error: (err as Error).message });
  }
});

router.post('/logout', async (req, res) => {
  try {
    const { user_uuid } = req.body;
    if (!user_uuid) {
      return res.status(400).json({ success: false, error: 'User UUID required' });
    }
    await authService.logout(user_uuid);
    res.json({ success: true, data: { message: 'Logged out' } });
  } catch (err) {
    res.status(400).json({ success: false, error: (err as Error).message });
  }
});

export default router;
