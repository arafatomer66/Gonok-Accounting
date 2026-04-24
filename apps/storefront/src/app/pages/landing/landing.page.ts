import { Component } from '@angular/core';

@Component({
  selector: 'sf-landing-page',
  standalone: true,
  template: `
    <div class="landing">
      <div class="landing__bg"></div>
      <div class="landing__content">
        <div class="landing__icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
        </div>
        <h1 class="landing__title">Gonok Storefront</h1>
        <p class="landing__subtitle">
          Discover product catalogs from local Bangladeshi businesses
        </p>
        <div class="landing__divider"></div>
        <p class="landing__hint">
          Visit a store by navigating to its unique link
        </p>
        <div class="landing__example">
          <code>/shop/my-store</code>
        </div>
      </div>
    </div>
  `,
  styles: `
    .landing {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #1e1e2f 0%, #2d2b55 50%, #4a3f8a 100%);
      position: relative;
      overflow: hidden;
    }
    .landing__bg {
      position: absolute;
      inset: 0;
      background:
        radial-gradient(ellipse 600px 400px at 20% 30%, rgba(67,97,238,0.15), transparent),
        radial-gradient(ellipse 500px 350px at 80% 70%, rgba(124,58,237,0.12), transparent);
    }
    .landing__content {
      text-align: center;
      padding: 3rem 2rem;
      position: relative;
      z-index: 1;
      max-width: 520px;
    }
    .landing__icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 88px;
      height: 88px;
      border-radius: 24px;
      background: linear-gradient(135deg, #4361ee, #7c3aed);
      color: #fff;
      margin-bottom: 2rem;
      box-shadow: 0 8px 32px rgba(67,97,238,0.35);
    }
    .landing__title {
      font-size: 2.75rem;
      font-weight: 800;
      color: #fff;
      margin: 0 0 0.75rem;
      letter-spacing: -0.03em;
    }
    .landing__subtitle {
      font-size: 1.1rem;
      color: rgba(255,255,255,0.6);
      margin: 0 0 2rem;
      line-height: 1.6;
    }
    .landing__divider {
      width: 48px;
      height: 3px;
      background: linear-gradient(90deg, #4361ee, #7c3aed);
      border-radius: 2px;
      margin: 0 auto 2rem;
    }
    .landing__hint {
      font-size: 0.9rem;
      color: rgba(255,255,255,0.45);
      margin: 0 0 1rem;
    }
    .landing__example code {
      display: inline-block;
      background: rgba(255,255,255,0.08);
      backdrop-filter: blur(8px);
      padding: 0.6rem 1.5rem;
      border-radius: 12px;
      color: #a5b4fc;
      font-size: 1rem;
      font-weight: 600;
      border: 1px solid rgba(255,255,255,0.08);
      letter-spacing: 0.02em;
    }
    @media (max-width: 600px) {
      .landing__title { font-size: 2rem; }
      .landing__icon { width: 72px; height: 72px; border-radius: 18px; }
      .landing__icon svg { width: 36px; height: 36px; }
    }
  `,
})
export class LandingPage {}
