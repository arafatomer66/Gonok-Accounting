import { Component, Input } from '@angular/core';
import type { IStorefrontBusiness } from '@org/shared-types';

@Component({
  selector: 'sf-business-header',
  standalone: true,
  template: `
    <header class="store-header">
      <div class="store-header__inner">
        @if (business) {
          <div class="store-header__logo">
            @if (business.logo_url) {
              <img [src]="business.logo_url" [alt]="business.name_en || ''" />
            } @else {
              <span class="store-header__initial">
                {{ (business.name_en || business.name_bn || '?')[0] }}
              </span>
            }
          </div>
          <div class="store-header__info">
            <h1 class="store-header__name">
              {{ business.name_en || business.name_bn }}
            </h1>
            @if (business.address && business.address.display_address) {
              <p class="store-header__address">{{ business.address.display_address }}</p>
            }
            @if (business.display_phone || business.phone) {
              <p class="store-header__phone">{{ business.display_phone || business.phone }}</p>
            }
          </div>
        }
      </div>
    </header>
  `,
  styles: `
    .store-header {
      background: linear-gradient(135deg, #1a73e8, #0d47a1);
      color: #fff;
      padding: 2rem 1.5rem;
    }
    .store-header__inner {
      max-width: 1200px;
      margin: 0 auto;
      display: flex;
      align-items: center;
      gap: 1.25rem;
    }
    .store-header__logo img {
      width: 64px;
      height: 64px;
      border-radius: 12px;
      object-fit: cover;
      border: 2px solid rgba(255, 255, 255, 0.3);
    }
    .store-header__initial {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 64px;
      height: 64px;
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.2);
      font-size: 1.75rem;
      font-weight: 700;
      text-transform: uppercase;
    }
    .store-header__name {
      margin: 0;
      font-size: 1.5rem;
      font-weight: 700;
    }
    .store-header__address,
    .store-header__phone {
      margin: 0.25rem 0 0;
      font-size: 0.875rem;
      opacity: 0.85;
    }
  `,
})
export class BusinessHeaderComponent {
  @Input() business: IStorefrontBusiness | null = null;
}
