import { Component, Input } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import type { IStorefrontProduct } from '@org/shared-types';

@Component({
  selector: 'sf-product-card',
  standalone: true,
  imports: [RouterLink, DecimalPipe],
  template: `
    <a class="product-card" [routerLink]="['product', product.uuid]">
      <div class="product-card__image">
        @if (product.thumbnail_url || product.image_url) {
          <img [src]="product.thumbnail_url || product.image_url" [alt]="product.name || ''" />
        } @else {
          <div class="product-card__placeholder">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M3 16l5-5 4 4 4-6 5 7" />
            </svg>
          </div>
        }
        @if (product.discount > 0) {
          <span class="product-card__badge">-{{ product.discount }}%</span>
        }
        @if (!product.in_stock) {
          <div class="product-card__out-of-stock">Out of Stock</div>
        }
      </div>
      <div class="product-card__body">
        @if (product.category_name) {
          <span class="product-card__category">{{ product.category_name }}</span>
        }
        <h3 class="product-card__name">{{ product.name }}</h3>
        <div class="product-card__price-row">
          <span class="product-card__price">{{'৳'}} {{ product.sales_price | number:'1.0-2' }}</span>
          @if (product.mrp_price > product.sales_price) {
            <span class="product-card__mrp">{{'৳'}} {{ product.mrp_price | number:'1.0-2' }}</span>
          }
        </div>
      </div>
    </a>
  `,
  styles: `
    .product-card {
      display: block;
      background: #fff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
      transition: transform 0.2s, box-shadow 0.2s;
      text-decoration: none;
      color: inherit;
    }
    .product-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
    }
    .product-card__image {
      position: relative;
      aspect-ratio: 1;
      background: #f5f5f5;
      overflow: hidden;
    }
    .product-card__image img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .product-card__placeholder {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
      color: #ccc;
    }
    .product-card__badge {
      position: absolute;
      top: 8px;
      right: 8px;
      background: #e53935;
      color: #fff;
      font-size: 0.75rem;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 4px;
    }
    .product-card__out-of-stock {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      background: rgba(0, 0, 0, 0.65);
      color: #fff;
      text-align: center;
      font-size: 0.8rem;
      font-weight: 600;
      padding: 4px;
    }
    .product-card__body {
      padding: 0.75rem;
    }
    .product-card__category {
      font-size: 0.7rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #888;
    }
    .product-card__name {
      margin: 0.25rem 0 0.5rem;
      font-size: 0.95rem;
      font-weight: 600;
      line-height: 1.3;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .product-card__price-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .product-card__price {
      font-size: 1.1rem;
      font-weight: 700;
      color: #1a73e8;
    }
    .product-card__mrp {
      font-size: 0.85rem;
      color: #999;
      text-decoration: line-through;
    }
  `,
})
export class ProductCardComponent {
  @Input({ required: true }) product!: IStorefrontProduct;
}
