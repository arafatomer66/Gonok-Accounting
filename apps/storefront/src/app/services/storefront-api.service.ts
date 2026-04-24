import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import type {
  IStorefrontBusiness,
  IStorefrontProduct,
  IStorefrontCategory,
} from '@org/shared-types';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

interface ProductsResponse {
  success: boolean;
  data: IStorefrontProduct[];
  total: number;
  page: number;
  limit: number;
}

@Injectable({ providedIn: 'root' })
export class StorefrontApiService {
  private http = inject(HttpClient);
  private base = '/api/v1/storefront';

  getBusiness(slug: string): Observable<IStorefrontBusiness> {
    return this.http
      .get<ApiResponse<IStorefrontBusiness>>(`${this.base}/${slug}`)
      .pipe(
        map((r) => {
          if (!r.success || !r.data) throw new Error(r.error || 'Store not found');
          return r.data;
        }),
      );
  }

  getProducts(
    slug: string,
    opts: { page?: number; limit?: number; category?: string; search?: string } = {},
  ): Observable<{ products: IStorefrontProduct[]; total: number; page: number; limit: number }> {
    const params: Record<string, string> = {};
    if (opts.page) params['page'] = String(opts.page);
    if (opts.limit) params['limit'] = String(opts.limit);
    if (opts.category) params['category'] = opts.category;
    if (opts.search) params['search'] = opts.search;

    return this.http
      .get<ProductsResponse>(`${this.base}/${slug}/products`, { params })
      .pipe(
        map((r) => ({
          products: r.data ?? [],
          total: r.total,
          page: r.page,
          limit: r.limit,
        })),
      );
  }

  getProduct(slug: string, slugOrUuid: string): Observable<IStorefrontProduct> {
    return this.http
      .get<ApiResponse<IStorefrontProduct>>(`${this.base}/${slug}/products/${slugOrUuid}`)
      .pipe(
        map((r) => {
          if (!r.success || !r.data) throw new Error(r.error || 'Product not found');
          return r.data;
        }),
      );
  }

  getCategories(slug: string): Observable<IStorefrontCategory[]> {
    return this.http
      .get<ApiResponse<IStorefrontCategory[]>>(`${this.base}/${slug}/categories`)
      .pipe(map((r) => r.data ?? []));
  }
}
