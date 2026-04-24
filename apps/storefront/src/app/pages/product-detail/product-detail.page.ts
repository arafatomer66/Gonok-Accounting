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
      padding: 2rem 1.5rem 3rem;
    }
    .detail__loading {
      text-align: center;
      padding: 5rem 1rem;
      color: #8b8fa3;
    }
    .spinner {
      width: 44px;
      height: 44px;
      border: 3px solid #e8eaf0;
      border-top-color: #4361ee;
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
      margin: 0 auto 1.25rem;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    .detail__error {
      text-align: center;
      padding: 4rem 1rem;
      color: #ef4444;
      background: #fef2f2;
      border-radius: 16px;
    }
    .detail__back-btn {
      display: inline-block;
      margin-top: 1.25rem;
      padding: 0.6rem 1.75rem;
      border: 1.5px solid #e8eaf0;
      border-radius: 12px;
      color: #1a1a2e;
      text-decoration: none;
      font-weight: 500;
      font-size: 0.9rem;
      transition: all 0.2s;
    }
    .detail__back-btn:hover {
      border-color: #4361ee;
      color: #4361ee;
    }
    .detail__back {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      color: #4361ee;
      text-decoration: none;
      font-size: 0.88rem;
      font-weight: 500;
      margin-bottom: 2rem;
      padding: 0.4rem 0.75rem;
      border-radius: 10px;
      transition: all 0.2s;
    }
    .detail__back:hover {
      background: rgba(67,97,238,0.06);
    }
    .detail__content {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 3rem;
      align-items: start;
    }
    .detail__image {
      background: linear-gradient(135deg, #f0f2f8, #e8eaf0);
      border-radius: 20px;
      overflow: hidden;
      aspect-ratio: 1;
      box-shadow: 0 4px 20px rgba(0,0,0,0.06);
    }
    .detail__image img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.4s cubic-bezier(.4,0,.2,1);
    }
    .detail__image:hover img {
      transform: scale(1.03);
    }
    .detail__placeholder {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
      color: #c5c9d6;
    }
    .detail__category {
      font-size: 0.72rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #7c3aed;
      font-weight: 600;
    }
    .detail__name {
      margin: 0.5rem 0 0;
      font-size: 1.85rem;
      font-weight: 800;
      color: #1a1a2e;
      letter-spacing: -0.02em;
      line-height: 1.25;
    }
    .detail__price-block {
      display: flex;
      align-items: baseline;
      gap: 0.75rem;
      margin: 1.25rem 0;
      padding: 1rem 1.25rem;
      background: linear-gradient(135deg, #f7f8fc, #eef0f8);
      border-radius: 14px;
    }
    .detail__price {
      font-size: 2rem;
      font-weight: 800;
      color: #1e1e2f;
    }
    .detail__mrp {
      font-size: 1.1rem;
      color: #aaa;
      text-decoration: line-through;
    }
    .detail__discount {
      font-size: 0.82rem;
      color: #fff;
      font-weight: 700;
      background: linear-gradient(135deg, #ef4444, #dc2626);
      padding: 3px 10px;
      border-radius: 20px;
      box-shadow: 0 2px 8px rgba(239,68,68,0.25);
    }
    .detail__stock {
      display: inline-flex;
      align-items: center;
      padding: 0.4rem 1rem;
      border-radius: 10px;
      font-size: 0.85rem;
      font-weight: 600;
      background: #f0fdf4;
      color: #22c55e;
      margin-bottom: 2rem;
    }
    .detail__stock--out {
      background: #fef2f2;
      color: #ef4444;
    }
    .detail__qty {
      font-weight: 400;
      color: #6b7085;
      margin-left: 0.35rem;
    }
    .detail__desc {
      margin-bottom: 2rem;
      padding: 1.25rem;
      background: #fff;
      border-radius: 14px;
      border: 1px solid #e8eaf0;
    }
    .detail__desc h3 {
      font-size: 0.82rem;
      margin: 0 0 0.75rem;
      color: #8b8fa3;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      font-weight: 600;
    }
    .detail__desc p {
      margin: 0;
      color: #4a4d5e;
      line-height: 1.7;
      font-size: 0.95rem;
    }
    .detail__meta {
      font-size: 0.88rem;
      color: #6b7085;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1rem;
      background: #f7f8fc;
      border-radius: 10px;
    }
    .detail__meta-label {
      font-weight: 600;
      color: #1a1a2e;
    }
    @media (max-width: 768px) {
      .detail { padding: 1.25rem 1rem 2rem; }
      .detail__content {
        grid-template-columns: 1fr;
        gap: 1.5rem;
      }
      .detail__name { font-size: 1.5rem; }
      .detail__price { font-size: 1.6rem; }
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
