import { env } from '../config/env';
import { IStorefrontProduct, IStorefrontCategory } from '@org/shared-types';

function getCouch() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const nano = require('nano');
  return nano(`http://${env.COUCHDB_USERNAME}:${env.COUCHDB_PASSWORD}@${new URL(env.COUCHDB_URL).host}`);
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export class StorefrontService {
  private getDb(userUuid: string) {
    const couch = getCouch();
    return couch.use(`gonok-${userUuid}`);
  }

  async getProducts(
    userUuid: string,
    businessUuid: string,
    opts: { page: number; limit: number; categoryUuid?: string; search?: string },
  ): Promise<{ products: IStorefrontProduct[]; total: number }> {
    const db = this.getDb(userUuid);

    // Fetch products and categories in parallel
    const [productResult, categories] = await Promise.all([
      db.allDocs({
        include_docs: true,
        startkey: 'product::',
        endkey: 'product::\ufff0',
      }),
      this.getCategoriesRaw(db, businessUuid),
    ]);

    const categoryMap = new Map(categories.map((c: IStorefrontCategory) => [c.uuid, c.name]));

    let docs = productResult.rows
      .map((r: any) => r.doc)
      .filter(
        (d: any) =>
          d && !d._deleted && d.business_uuid === businessUuid && d.active !== false,
      );

    if (opts.categoryUuid) {
      docs = docs.filter((d: any) => d.category_uuid === opts.categoryUuid);
    }
    if (opts.search) {
      const term = opts.search.toLowerCase();
      docs = docs.filter(
        (d: any) =>
          d.name?.toLowerCase().includes(term) ||
          d.code?.toLowerCase().includes(term) ||
          d.description?.toLowerCase().includes(term),
      );
    }

    const total = docs.length;
    const start = (opts.page - 1) * opts.limit;
    const paginated = docs.slice(start, start + opts.limit);

    const products: IStorefrontProduct[] = paginated.map((d: any) =>
      this.mapProduct(d, categoryMap),
    );

    return { products, total };
  }

  async getProduct(
    userUuid: string,
    businessUuid: string,
    uuidOrSlug: string,
  ): Promise<IStorefrontProduct | null> {
    const db = this.getDb(userUuid);

    // Try direct UUID lookup first
    try {
      const doc = await db.get(`product::${uuidOrSlug}`);
      if (doc.business_uuid === businessUuid && doc.active !== false) {
        const categories = await this.getCategoriesRaw(db, businessUuid);
        const categoryMap = new Map(categories.map((c: IStorefrontCategory) => [c.uuid, c.name]));
        return this.mapProduct(doc, categoryMap);
      }
    } catch {
      // Not found by UUID — try slug match below
    }

    // Fall back to slug scan
    const { products } = await this.getProducts(userUuid, businessUuid, {
      page: 1,
      limit: 10000,
    });
    return products.find((p) => p.slug === uuidOrSlug) ?? null;
  }

  async getCategories(
    userUuid: string,
    businessUuid: string,
  ): Promise<IStorefrontCategory[]> {
    const db = this.getDb(userUuid);
    return this.getCategoriesRaw(db, businessUuid);
  }

  private async getCategoriesRaw(
    db: any,
    businessUuid: string,
  ): Promise<IStorefrontCategory[]> {
    const result = await db.allDocs({
      include_docs: true,
      startkey: 'category::',
      endkey: 'category::\ufff0',
    });
    return result.rows
      .map((r: any) => r.doc)
      .filter(
        (d: any) =>
          d &&
          !d._deleted &&
          d.business_uuid === businessUuid &&
          d.is_enabled !== false,
      )
      .map((d: any) => ({ uuid: d.uuid, name: d.name }));
  }

  private mapProduct(
    d: any,
    categoryMap: Map<string, string | null>,
  ): IStorefrontProduct {
    const qty = d.quantity ?? 0;
    return {
      uuid: d.uuid,
      name: d.name,
      slug: d.name ? slugify(d.name) : d.uuid,
      description: d.description,
      sales_price: d.sales_price ?? 0,
      mrp_price: d.mrp_price ?? 0,
      discount: d.discount ?? 0,
      unit: d.unit,
      category_uuid: d.category_uuid,
      category_name: categoryMap.get(d.category_uuid) ?? null,
      image_url: d.image_url,
      thumbnail_url: d.thumbnail_url,
      quantity: qty,
      in_stock: qty > 0,
    };
  }
}
