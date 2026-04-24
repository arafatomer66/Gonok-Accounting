import { Router } from 'express';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';
import { UploadService } from '../services/upload.service';

const router = Router();
const uploadService = new UploadService();

// Multer — memory storage (buffer), 5MB limit
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

// Rate limit: 20 uploads per 15 minutes
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many uploads, please try again later' },
});

router.use(authMiddleware);

/**
 * POST /api/v1/upload/image
 * Upload a single image to S3/CloudFront.
 *
 * Body (multipart/form-data):
 *   - file: image file (jpeg, png, webp, gif — max 5MB)
 *   - folder: string (e.g., "business-logos", "products", "profile")
 *
 * Response: { success: true, data: { url: "https://cdn.example.com/..." } }
 */
router.post('/image', uploadLimiter, upload.single('file'), async (req: AuthRequest, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file provided' });
    }

    const folder = (req.body.folder as string) || 'general';

    // Whitelist allowed folders
    const allowedFolders = ['business-logos', 'products', 'profile'];
    if (!allowedFolders.includes(folder)) {
      return res.status(400).json({
        success: false,
        error: `Invalid folder: ${folder}. Allowed: ${allowedFolders.join(', ')}`,
      });
    }

    const url = await uploadService.uploadImage(req.file, folder);

    res.json({ success: true, data: { url } });
  } catch (err) {
    res.status(400).json({ success: false, error: (err as Error).message });
  }
});

/**
 * DELETE /api/v1/upload/image
 * Delete an image from S3 by URL.
 *
 * Body: { url: "https://cdn.example.com/..." }
 */
router.delete('/image', async (req: AuthRequest, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ success: false, error: 'No URL provided' });
    }

    await uploadService.deleteImage(url);
    res.json({ success: true, data: { message: 'Image deleted' } });
  } catch (err) {
    res.status(400).json({ success: false, error: (err as Error).message });
  }
});

export default router;
