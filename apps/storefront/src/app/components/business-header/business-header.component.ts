import { Component, Input } from '@angular/core';
import type { IStorefrontBusiness } from '@org/shared-types';

@Component({
  selector: 'sf-business-header',
  standalone: true,
  template: `
    <header class="header">
      <div class="header__inner">
        @if (business) {
          <div class="header__logo">
            @if (business.logo_url) {
              <img [src]="business.logo_url" [alt]="business.name_en || ''" />
            } @else {
              <span class="header__initial">
                {{ (business.name_en || business.name_bn || '?')[0] }}
              </span>
            }
          </div>
          <div class="header__info">
            <h1 class="header__name">
              {{ business.name_en || business.name_bn }}
            </h1>
            <div class="header__meta">
              @if (business.address && business.address.display_address) {
                <span class="header__tag">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                  {{ business.address.display_address }}
                </span>
              }
              @if (business.display_phone || business.phone) {
                <span class="header__tag">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                  {{ business.display_phone || business.phone }}
                </span>
              }
            </div>
          </div>
        } @else {
          <div class="header__skeleton">
            <div class="skeleton-circle"></div>
            <div class="skeleton-lines">
              <div class="skeleton-line skeleton-line--lg"></div>
              <div class="skeleton-line skeleton-line--sm"></div>
            </div>
          </div>
        }
      </div>
    </header>
  `,
  styles: `
    .header {
      background: linear-gradient(135deg, #1e1e2f 0%, #2d2b55 50%, #4a3f8a 100%);
      color: #fff;
      padding: 2.5rem 1.5rem;
      position: relative;
      overflow: hidden;
    }
    .header::before {
      content: '';
      position: absolute;
      top: -50%;
      right: -20%;
      width: 500px;
      height: 500px;
      background: radial-gradient(circle, rgba(255,255,255,0.04) 0%, transparent 70%);
      border-radius: 50%;
    }
    .header::after {
      content: '';
      position: absolute;
      bottom: -30%;
      left: -10%;
      width: 300px;
      height: 300px;
      background: radial-gradient(circle, rgba(67,97,238,0.15) 0%, transparent 70%);
      border-radius: 50%;
    }
    .header__inner {
      max-width: 1200px;
      margin: 0 auto;
      display: flex;
      align-items: center;
      gap: 1.5rem;
      position: relative;
      z-index: 1;
    }
    .header__logo img {
      width: 72px;
      height: 72px;
      border-radius: 16px;
      object-fit: cover;
      border: 3px solid rgba(255,255,255,0.2);
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    }
    .header__initial {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 72px;
      height: 72px;
      border-radius: 16px;
      background: linear-gradient(135deg, #4361ee, #7c3aed);
      font-size: 2rem;
      font-weight: 800;
      text-transform: uppercase;
      box-shadow: 0 4px 20px rgba(67,97,238,0.4);
    }
    .header__name {
      margin: 0;
      font-size: 1.75rem;
      font-weight: 800;
      letter-spacing: -0.02em;
    }
    .header__meta {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
      margin-top: 0.5rem;
    }
    .header__tag {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      font-size: 0.85rem;
      opacity: 0.75;
    }
    .header__skeleton {
      display: flex;
      align-items: center;
      gap: 1.5rem;
      width: 100%;
    }
    .skeleton-circle {
      width: 72px;
      height: 72px;
      border-radius: 16px;
      background: rgba(255,255,255,0.1);
      animation: pulse 1.5s ease-in-out infinite;
    }
    .skeleton-lines { flex: 1; }
    .skeleton-line {
      height: 14px;
      border-radius: 7px;
      background: rgba(255,255,255,0.1);
      animation: pulse 1.5s ease-in-out infinite;
    }
    .skeleton-line--lg { width: 200px; margin-bottom: 0.5rem; height: 20px; }
    .skeleton-line--sm { width: 140px; }
    @keyframes pulse {
      0%, 100% { opacity: 0.4; }
      50% { opacity: 0.8; }
    }
    @media (max-width: 600px) {
      .header { padding: 1.75rem 1.25rem; }
      .header__name { font-size: 1.35rem; }
      .header__logo img, .header__initial { width: 56px; height: 56px; font-size: 1.5rem; }
    }
  `,
})
export class BusinessHeaderComponent {
  @Input() business: IStorefrontBusiness | null = null;
}
