import { Component, Input } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import type { IStorefrontProduct } from '@org/shared-types';

@Component({
  selector: 'sf-product-card',
  standalone: true,
  imports: [RouterLink, DecimalPipe],
  template: `
    <a class="card" [routerLink]="['product', product.uuid]">
      <div class="card__img">
        @if (product.thumbnail_url || product.image_url) {
          <img [src]="product.thumbnail_url || product.image_url" [alt]="product.name || ''" loading="lazy" />
        } @else {
          <div class="card__placeholder">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round">
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
              <line x1="7" y1="7" x2="7.01" y2="7"/>
            </svg>
          </div>
        }
        @if (product.discount > 0) {
          <span class="card__discount">-{{ product.discount }}%</span>
        }
        @if (!product.in_stock) {
          <div class="card__oos">Out of Stock</div>
        }
      </div>
      <div class="card__body">
        @if (product.category_name) {
          <span class="card__cat">{{ product.category_name }}</span>
        }
        <h3 class="card__name">{{ product.name }}</h3>
        <div class="card__bottom">
          <div class="card__prices">
            <span class="card__price">&#2547;{{ product.sales_price | number:'1.0-2' }}</span>
            @if (product.mrp_price > product.sales_price) {
              <span class="card__mrp">&#2547;{{ product.mrp_price | number:'1.0-2' }}</span>
            }
          </div>
          @if (product.in_stock) {
            <span class="card__stock">{{ product.quantity }} {{ product.unit || 'pcs' }}</span>
          }
        </div>
      </div>
    </a>
  `,
  styles: `
    .card {
      display: flex;
      flex-direction: column;
      background: #fff;
      border-radius: 16px;
      overflow: hidden;
      text-decoration: none;
      color: inherit;
      transition: transform 0.25s cubic-bezier(.4,0,.2,1), box-shadow 0.25s cubic-bezier(.4,0,.2,1);
      box-shadow: 0 1px 4px rgba(0,0,0,0.04), 0 2px 8px rgba(0,0,0,0.04);
      border: 1px solid rgba(0,0,0,0.04);
    }
    .card:hover {
      transform: translateY(-4px);
      box-shadow: 0 12px 32px rgba(0,0,0,0.1), 0 2px 8px rgba(0,0,0,0.06);
    }
    .card__img {
      position: relative;
      aspect-ratio: 1;
      background: linear-gradient(135deg, #f0f2f8, #e8eaf0);
      overflow: hidden;
    }
    .card__img img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.4s cubic-bezier(.4,0,.2,1);
    }
    .card:hover .card__img img {
      transform: scale(1.05);
    }
    .card__placeholder {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
      color: #c5c9d6;
    }
    .card__discount {
      position: absolute;
      top: 10px;
      left: 10px;
      background: linear-gradient(135deg, #ef4444, #dc2626);
      color: #fff;
      font-size: 0.72rem;
      font-weight: 700;
      padding: 3px 10px;
      border-radius: 20px;
      letter-spacing: 0.02em;
      box-shadow: 0 2px 8px rgba(239,68,68,0.3);
    }
    .card__oos {
      position: absolute;
      inset: 0;
      background: rgba(15,15,30,0.6);
      backdrop-filter: blur(2px);
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.85rem;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }
    .card__body {
      padding: 1rem;
      display: flex;
      flex-direction: column;
      flex: 1;
    }
    .card__cat {
      font-size: 0.68rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #7c3aed;
      font-weight: 600;
    }
    .card__name {
      margin: 0.3rem 0 0;
      font-size: 0.95rem;
      font-weight: 600;
      line-height: 1.35;
      color: #1a1a2e;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      flex: 1;
    }
    .card__bottom {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      margin-top: 0.75rem;
    }
    .card__prices {
      display: flex;
      align-items: baseline;
      gap: 0.4rem;
    }
    .card__price {
      font-size: 1.15rem;
      font-weight: 800;
      color: #1e1e2f;
    }
    .card__mrp {
      font-size: 0.8rem;
      color: #aaa;
      text-decoration: line-through;
    }
    .card__stock {
      font-size: 0.72rem;
      color: #22c55e;
      font-weight: 600;
      background: #f0fdf4;
      padding: 2px 8px;
      border-radius: 10px;
    }
    @media (max-width: 600px) {
      .card__body { padding: 0.75rem; }
      .card__name { font-size: 0.85rem; }
      .card__price { font-size: 1rem; }
    }
  `,
})
export class ProductCardComponent {
  @Input({ required: true }) product!: IStorefrontProduct;
}
