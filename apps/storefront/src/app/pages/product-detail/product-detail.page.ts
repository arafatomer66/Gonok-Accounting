import { Component, Input, OnInit, signal, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { StorefrontApiService } from '../../services/storefront-api.service';
import { BusinessHeaderComponent } from '../../components/business-header/business-header.component';
import type { IStorefrontBusiness, IStorefrontProduct } from '@org/shared-types';

@Component({
  selector: 'sf-product-detail-page',
  standalone: true,
  imports: [RouterLink, BusinessHeaderComponent],
  template: `
    <sf-business-header [business]="business()" />

    <div class="detail">
      @if (loading()) {
        <div class="detail__loading">
          <div class="spinner"></div>
          <p>Loading product...</p>
        </div>
      }

      @if (error()) {
        <div class="detail__error">
          <p>{{ error() }}</p>
          <a class="detail__back-btn" [routerLink]="['/', businessSlug]">Back to catalog</a>
        </div>
      }

      @if (product(); as p) {
        <a class="detail__back" [routerLink]="['/', businessSlug]">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back to catalog
        </a>

        <div class="detail__content">
          <!-- Image -->
          <div class="detail__image">
            @if (p.image_url) {
              <img [src]="p.image_url" [alt]="p.name || ''" />
            } @else {
              <div class="detail__placeholder">
                <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <path d="M3 16l5-5 4 4 4-6 5 7" />
                </svg>
              </div>
            }
          </div>

          <!-- Info -->
          <div class="detail__info">
            @if (p.category_name) {
              <span class="detail__category">{{ p.category_name }}</span>
            }
            <h1 class="detail__name">{{ p.name }}</h1>

            <div class="detail__price-block">
              <span class="detail__price">{{'৳'}} {{ p.sales_price }}</span>
              @if (p.mrp_price > p.sales_price) {
                <span class="detail__mrp">{{'৳'}} {{ p.mrp_price }}</span>
                <span class="detail__discount">{{ p.discount }}% off</span>
              }
            </div>

            <div class="detail__stock" [class.detail__stock--out]="!p.in_stock">
              {{ p.in_stock ? 'In Stock' : 'Out of Stock' }}
              @if (p.in_stock && p.quantity > 0) {
                <span class="detail__qty">({{ p.quantity }} {{ p.unit || 'pcs' }} available)</span>
              }
            </div>

            @if (p.description) {
              <div class="detail__desc">
                <h3>Description</h3>
                <p>{{ p.description }}</p>
              </div>
            }

            @if (p.unit) {
              <div class="detail__meta">
                <span class="detail__meta-label">Unit:</span>
                <span>{{ p.unit }}</span>
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: `
    .detail {
      max-width: 1200px;
      margin: 0 auto;
      padding: 1.5rem;
    }
    .detail__loading {
      text-align: center;
      padding: 4rem 1rem;
      color: #888;
    }
    .spinner {
      width: 40px;
      height: 40px;
      border: 3px solid #eee;
      border-top-color: #1a73e8;
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
      margin: 0 auto 1rem;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    .detail__error {
      text-align: center;
      padding: 4rem 1rem;
      color: #c62828;
    }
    .detail__back-btn {
      display: inline-block;
      margin-top: 1rem;
      padding: 0.5rem 1.5rem;
      border: 1px solid #ddd;
      border-radius: 8px;
      color: #333;
      text-decoration: none;
    }
    .detail__back {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      color: #1a73e8;
      text-decoration: none;
      font-size: 0.9rem;
      margin-bottom: 1.5rem;
    }
    .detail__back:hover {
      text-decoration: underline;
    }
    .detail__content {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 2.5rem;
      align-items: start;
    }
    .detail__image {
      background: #f5f5f5;
      border-radius: 12px;
      overflow: hidden;
      aspect-ratio: 1;
    }
    .detail__image img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .detail__placeholder {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
      color: #ccc;
    }
    .detail__category {
      font-size: 0.8rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #888;
    }
    .detail__name {
      margin: 0.5rem 0;
      font-size: 1.75rem;
      font-weight: 700;
      color: #222;
    }
    .detail__price-block {
      display: flex;
      align-items: baseline;
      gap: 0.75rem;
      margin: 1rem 0;
    }
    .detail__price {
      font-size: 1.75rem;
      font-weight: 700;
      color: #1a73e8;
    }
    .detail__mrp {
      font-size: 1.1rem;
      color: #999;
      text-decoration: line-through;
    }
    .detail__discount {
      font-size: 0.9rem;
      color: #e53935;
      font-weight: 600;
    }
    .detail__stock {
      display: inline-block;
      padding: 0.35rem 0.75rem;
      border-radius: 6px;
      font-size: 0.85rem;
      font-weight: 600;
      background: #e8f5e9;
      color: #2e7d32;
      margin-bottom: 1.5rem;
    }
    .detail__stock--out {
      background: #ffebee;
      color: #c62828;
    }
    .detail__qty {
      font-weight: 400;
      color: #666;
      margin-left: 0.25rem;
    }
    .detail__desc {
      margin-bottom: 1.5rem;
    }
    .detail__desc h3 {
      font-size: 1rem;
      margin: 0 0 0.5rem;
      color: #444;
    }
    .detail__desc p {
      margin: 0;
      color: #666;
      line-height: 1.6;
    }
    .detail__meta {
      font-size: 0.9rem;
      color: #666;
    }
    .detail__meta-label {
      font-weight: 600;
      color: #444;
      margin-right: 0.25rem;
    }
    @media (max-width: 768px) {
      .detail__content {
        grid-template-columns: 1fr;
        gap: 1.5rem;
      }
    }
  `,
})
export class ProductDetailPage implements OnInit {
  @Input() businessSlug!: string;
  @Input() slugOrUuid!: string;

  private api = inject(StorefrontApiService);

  business = signal<IStorefrontBusiness | null>(null);
  product = signal<IStorefrontProduct | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);

  ngOnInit() {
    this.api.getBusiness(this.businessSlug).subscribe({
      next: (biz) => this.business.set(biz),
    });

    this.loading.set(true);
    this.api.getProduct(this.businessSlug, this.slugOrUuid).subscribe({
      next: (p) => {
        this.product.set(p);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.message || 'Product not found');
        this.loading.set(false);
      },
    });
  }
}
