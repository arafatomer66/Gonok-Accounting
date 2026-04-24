import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { BusinessService } from '../services/business.service';
import { StorefrontService } from '../services/storefront.service';

const router = Router();
const businessService = new BusinessService();
const storefrontService = new StorefrontService();

// Rate limiting for public endpoints
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests, please try again later' },
});
router.use(limiter);

// Helper: resolve business slug → business + owner UUID
async function resolveStore(businessSlug: string) {
  const business = await businessService.getBySlug(businessSlug);
  if (!business) return null;
  const ownerUuid = await businessService.getOwnerUuid(business.uuid);
  if (!ownerUuid) return null;
  return { business, ownerUuid };
}

// GET /api/v1/storefront/:businessSlug — business info
router.get('/:businessSlug', async (req: Request, res: Response) => {
  try {
    const store = await resolveStore(req.params.businessSlug);
    if (!store) {
      res.status(404).json({ success: false, error: 'Store not found' });
      return;
    }
    const { business } = store;
    res.json({
      success: true,
      data: {
        uuid: business.uuid,
        name_en: business.name_en,
        name_bn: business.name_bn,
        slug: business.slug,
        phone: business.phone,
        display_phone: business.display_phone,
        logo_url: business.logo_url,
        address: business.address,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

// GET /api/v1/storefront/:businessSlug/products — paginated product listing
router.get('/:businessSlug/products', async (req: Request, res: Response) => {
  try {
    const store = await resolveStore(req.params.businessSlug);
    if (!store) {
      res.status(404).json({ success: false, error: 'Store not found' });
      return;
    }
    const page = Math.max(1, parseInt(req.query['page'] as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query['limit'] as string) || 24));
    const categoryUuid = req.query['category'] as string | undefined;
    const search = req.query['search'] as string | undefined;

    const result = await storefrontService.getProducts(store.ownerUuid, store.business.uuid, {
      page,
      limit,
      categoryUuid,
      search,
    });

    res.json({
      success: true,
      data: result.products,
      total: result.total,
      page,
      limit,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

// GET /api/v1/storefront/:businessSlug/products/:slugOrUuid — single product
router.get('/:businessSlug/products/:slugOrUuid', async (req: Request, res: Response) => {
  try {
    const store = await resolveStore(req.params.businessSlug);
    if (!store) {
      res.status(404).json({ success: false, error: 'Store not found' });
      return;
    }
    const product = await storefrontService.getProduct(
      store.ownerUuid,
      store.business.uuid,
      req.params.slugOrUuid,
    );
    if (!product) {
      res.status(404).json({ success: false, error: 'Product not found' });
      return;
    }
    res.json({ success: true, data: product });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

// GET /api/v1/storefront/:businessSlug/categories — category list
router.get('/:businessSlug/categories', async (req: Request, res: Response) => {
  try {
    const store = await resolveStore(req.params.businessSlug);
    if (!store) {
      res.status(404).json({ success: false, error: 'Store not found' });
      return;
    }
    const categories = await storefrontService.getCategories(
      store.ownerUuid,
      store.business.uuid,
    );
    res.json({ success: true, data: categories });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

export default router;
