import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { PouchDbService } from '../../core/services/pouchdb.service';
import { AuthStore, Business } from '../../core/stores/auth.store';
import { ETables } from '@org/shared-types';

@Component({
  selector: 'gonok-create-business',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="create-biz-page">
      <div class="create-biz-card">
        <div class="create-biz-header">
          <h1 class="create-biz-logo">গণক</h1>
          <h2 class="create-biz-title">Create Your Business</h2>
          <p class="create-biz-subtitle">Add your business details to get started</p>
        </div>

        <form (ngSubmit)="createBusiness()" class="create-biz-form">
          <div class="form-group">
            <label class="form-label">Business Name (English)</label>
            <input
              class="form-input"
              type="text"
              [(ngModel)]="nameEn"
              name="nameEn"
              placeholder="e.g. My Shop"
              required
            />
          </div>

          <div class="form-group">
            <label class="form-label">ব্যবসার নাম (বাংলা)</label>
            <input
              class="form-input"
              type="text"
              [(ngModel)]="nameBn"
              name="nameBn"
              placeholder="যেমন: আমার দোকান"
            />
          </div>

          <div class="form-group">
            <label class="form-label">Phone Number</label>
            <input
              class="form-input"
              type="tel"
              [(ngModel)]="phone"
              name="phone"
              placeholder="01XXXXXXXXX"
            />
          </div>

          <div class="form-group">
            <label class="form-label">Address</label>
            <input
              class="form-input"
              type="text"
              [(ngModel)]="address"
              name="address"
              placeholder="Shop address"
            />
          </div>

          @if (error()) {
            <p class="form-error">{{ error() }}</p>
          }

          <button class="btn btn--primary btn--block" type="submit" [disabled]="loading()">
            {{ loading() ? 'Creating...' : 'Create Business' }}
          </button>
        </form>
      </div>
    </div>
  `,
  styles: `
    @use '../../../styles/abstracts/variables' as *;

    .create-biz-page {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: $color-bg;
      padding: $space-4;
    }

    .create-biz-card {
      background: $color-surface;
      border-radius: $radius-xl;
      box-shadow: $shadow-md;
      padding: $space-8;
      width: 100%;
      max-width: 480px;
    }

    .create-biz-header {
      text-align: center;
      margin-bottom: $space-6;
    }

    .create-biz-logo {
      font-size: 2.5rem;
      font-weight: 700;
      color: $color-primary;
      margin-bottom: $space-2;
    }

    .create-biz-title {
      font-size: $font-size-xl;
      font-weight: 600;
      color: $color-text;
      margin-bottom: $space-1;
    }

    .create-biz-subtitle {
      color: $color-text-secondary;
      font-size: $font-size-base;
    }

    .create-biz-form {
      display: flex;
      flex-direction: column;
      gap: $space-4;
    }
  `,
})
export class CreateBusinessComponent {
  private api = inject(ApiService);
  private pouchDb = inject(PouchDbService);
  private authStore = inject(AuthStore);
  private router = inject(Router);

  nameEn = '';
  nameBn = '';
  phone = '';
  address = '';
  loading = signal(false);
  error = signal('');

  createBusiness(): void {
    if (!this.nameEn && !this.nameBn) {
      this.error.set('At least one business name is required');
      return;
    }

    this.loading.set(true);
    this.error.set('');

    this.api
      .post<Business>('/businesses', {
        name_en: this.nameEn || null,
        name_bn: this.nameBn || null,
        phone: this.phone || null,
        address: {
          display_address: this.address || null,
          city: null,
          district: null,
          country_code: 'BD',
        },
      })
      .subscribe({
        next: async (business) => {
          // Cache in PouchDB
          await this.pouchDb.put(ETables.BUSINESS, business.uuid, business as unknown as Record<string, unknown>);
          // Refresh businesses list and set active
          this.api.get<Business[]>('/businesses').subscribe({
            next: async (businesses) => {
              this.authStore.setBusinesses(businesses);
              for (const biz of businesses) {
                await this.pouchDb.put(ETables.BUSINESS, biz.uuid, biz as unknown as Record<string, unknown>);
              }
              this.loading.set(false);
              this.router.navigate(['/dashboard']);
            },
            error: () => {
              this.authStore.setBusinesses([business]);
              this.loading.set(false);
              this.router.navigate(['/dashboard']);
            },
          });
        },
        error: (err) => {
          this.error.set(err.message || 'Failed to create business');
          this.loading.set(false);
        },
      });
  }
}
