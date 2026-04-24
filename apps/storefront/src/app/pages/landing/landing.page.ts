import { Component } from '@angular/core';

@Component({
  selector: 'sf-landing-page',
  standalone: true,
  template: `
    <div class="landing">
      <div class="landing__content">
        <h1 class="landing__title">Gonok Storefront</h1>
        <p class="landing__subtitle">
          Browse product catalogs from local businesses
        </p>
        <p class="landing__hint">
          Visit a store by navigating to its unique link, e.g.
          <code>/my-store</code>
        </p>
      </div>
    </div>
  `,
  styles: `
    .landing {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #f5f7fa, #e8edf2);
    }
    .landing__content {
      text-align: center;
      padding: 2rem;
    }
    .landing__title {
      font-size: 2.5rem;
      font-weight: 800;
      color: #1a73e8;
      margin: 0 0 0.5rem;
    }
    .landing__subtitle {
      font-size: 1.1rem;
      color: #555;
      margin: 0 0 1.5rem;
    }
    .landing__hint {
      font-size: 0.9rem;
      color: #888;
    }
    .landing__hint code {
      background: #e3f2fd;
      padding: 0.15rem 0.5rem;
      border-radius: 4px;
      color: #1a73e8;
    }
  `,
})
export class LandingPage {}
