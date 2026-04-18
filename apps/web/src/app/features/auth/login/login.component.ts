import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthApiService } from '../../../core/services/auth.service';
import { AuthStore, Business } from '../../../core/stores/auth.store';
import { ApiService } from '../../../core/services/api.service';
import { PouchDbService } from '../../../core/services/pouchdb.service';
import { SyncBootstrapService } from '../../../core/services/sync-bootstrap.service';
import { ETables } from '@org/shared-types';

@Component({
  selector: 'gonok-login',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <div class="auth-page">
      <div class="auth-card">
        <div class="auth-header">
          <h1 class="auth-logo">গণক</h1>
          <p class="auth-subtitle">Sign in to your account</p>
        </div>

        @if (!otpSent()) {
          <form (ngSubmit)="requestOtp()" class="auth-form">
            <div class="form-group">
              <label class="form-label">Phone Number</label>
              <input
                class="form-input"
                type="tel"
                [(ngModel)]="phone"
                name="phone"
                placeholder="01XXXXXXXXX"
                required
              />
            </div>
            @if (error()) {
              <p class="form-error">{{ error() }}</p>
            }
            <button class="btn btn--primary btn--block" type="submit" [disabled]="loading()">
              {{ loading() ? 'Sending...' : 'Send OTP' }}
            </button>
          </form>
        } @else {
          <form (ngSubmit)="verifyOtp()" class="auth-form">
            <div class="form-group">
              <label class="form-label">Enter OTP sent to {{ phone }}</label>
              <input
                class="form-input"
                type="text"
                [(ngModel)]="otp"
                name="otp"
                placeholder="6-digit code"
                maxlength="6"
                required
              />
            </div>
            @if (error()) {
              <p class="form-error">{{ error() }}</p>
            }
            <button class="btn btn--primary btn--block" type="submit" [disabled]="loading()">
              {{ loading() ? 'Verifying...' : 'Verify OTP' }}
            </button>
            <button class="btn btn--ghost btn--block" type="button" (click)="otpSent.set(false)">
              Change phone number
            </button>
          </form>
        }

        <p class="auth-footer">
          Don't have an account? <a routerLink="/register">Register</a>
        </p>
      </div>
    </div>
  `,
  styles: `
    @use '../../../../styles/abstracts/variables' as *;

    .auth-page {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: $color-bg;
      padding: $space-4;
    }

    .auth-card {
      background: $color-surface;
      border-radius: $radius-xl;
      box-shadow: $shadow-md;
      padding: $space-8;
      width: 100%;
      max-width: 400px;
    }

    .auth-header {
      text-align: center;
      margin-bottom: $space-6;
    }

    .auth-logo {
      font-size: 2.5rem;
      font-weight: 700;
      color: $color-primary;
      margin-bottom: $space-2;
    }

    .auth-subtitle {
      color: $color-text-secondary;
      font-size: $font-size-base;
    }

    .auth-form {
      display: flex;
      flex-direction: column;
      gap: $space-4;
    }

    .auth-footer {
      text-align: center;
      margin-top: $space-5;
      font-size: $font-size-sm;
      color: $color-text-secondary;
      a { color: $color-primary; font-weight: 500; }
    }
  `,
})
export class LoginComponent {
  private authApi = inject(AuthApiService);
  private authStore = inject(AuthStore);
  private api = inject(ApiService);
  private pouchDb = inject(PouchDbService);
  private router = inject(Router);
  private syncBootstrap = inject(SyncBootstrapService);

  phone = '';
  otp = '';
  otpSent = signal(false);
  loading = signal(false);
  error = signal('');

  requestOtp(): void {
    if (!this.phone) return;
    this.loading.set(true);
    this.error.set('');

    this.authApi.login(this.phone).subscribe({
      next: () => {
        this.otpSent.set(true);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.error || err.message || 'Failed to send OTP');
        this.loading.set(false);
      },
    });
  }

  verifyOtp(): void {
    if (!this.otp) return;
    this.loading.set(true);
    this.error.set('');

    this.authApi.verifyOtp(this.phone, this.otp).subscribe({
      next: async (result) => {
        this.authStore.setAuth(result.user, result.access_token, result.refresh_token);

        // Wait for initial sync from CouchDB before loading data
        await this.syncBootstrap.start();

        // Fetch businesses then navigate
        this.api.get<Business[]>('/businesses').subscribe({
          next: async (businesses) => {
            this.authStore.setBusinesses(businesses);
            for (const biz of businesses) {
              await this.pouchDb.put(ETables.BUSINESS, biz.uuid, biz as unknown as Record<string, unknown>);
            }
            this.loading.set(false);
            this.router.navigate([businesses.length > 0 ? '/dashboard' : '/create-business']);
          },
          error: async () => {
            // API failed — try PouchDB (may have data from sync)
            try {
              const db = this.pouchDb.getDatabase();
              const res = await db.allDocs({
                include_docs: true,
                startkey: ETables.BUSINESS + '::',
                endkey: ETables.BUSINESS + '::\ufff0',
              });
              const bizDocs = res.rows.filter((r) => r.doc).map((r) => r.doc as unknown as Business);
              if (bizDocs.length > 0) {
                this.authStore.setBusinesses(bizDocs);
                this.loading.set(false);
                this.router.navigate(['/dashboard']);
                return;
              }
            } catch { /* PouchDB also empty */ }
            this.loading.set(false);
            this.router.navigate(['/create-business']);
          },
        });
      },
      error: (err) => {
        this.error.set(err.error?.error || err.message || 'Invalid OTP');
        this.loading.set(false);
      },
    });
  }
}
