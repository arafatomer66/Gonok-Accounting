import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { AuthStore, Business } from '../../core/stores/auth.store';
import { ApiService } from '../../core/services/api.service';
import { PouchDbService } from '../../core/services/pouchdb.service';
import { BusinessSwitchService } from '../../core/services/business-switch.service';
import { ETables } from '@org/shared-types';

@Component({
  selector: 'gonok-business-list',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="page-header">
      <h1 class="page-header__title">Businesses</h1>
      @if (!showForm()) {
        <button class="btn btn--primary" (click)="showForm.set(true)">+ Add Business</button>
      }
    </div>

    @if (showForm()) {
      <div class="card mb-4">
        <div class="card__header">
          <h3 class="card__title">{{ editingBiz() ? 'Edit Business' : 'New Business' }}</h3>
        </div>
        <div class="card__body">
          <form (ngSubmit)="saveBusiness()" class="biz-form">
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Business Name (English) *</label>
                <input class="form-input" type="text" [(ngModel)]="formNameEn" name="nameEn" placeholder="e.g. My Shop" />
              </div>
              <div class="form-group">
                <label class="form-label">ব্যবসার নাম (বাংলা)</label>
                <input class="form-input" type="text" [(ngModel)]="formNameBn" name="nameBn" placeholder="যেমন: আমার দোকান" />
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Phone</label>
                <input class="form-input" type="tel" [(ngModel)]="formPhone" name="phone" placeholder="01XXXXXXXXX" />
              </div>
              <div class="form-group">
                <label class="form-label">Address</label>
                <input class="form-input" type="text" [(ngModel)]="formAddress" name="address" placeholder="Shop address" />
              </div>
            </div>
            @if (formError()) {
              <p class="form-error">{{ formError() }}</p>
            }
            <div class="flex gap-2">
              <button class="btn btn--primary" type="submit" [disabled]="formLoading()">
                {{ formLoading() ? 'Saving...' : 'Save' }}
              </button>
              <button class="btn btn--ghost" type="button" (click)="cancelForm()">Cancel</button>
            </div>
          </form>
        </div>
      </div>
    }

    <div class="biz-grid">
      @for (biz of businesses(); track biz.uuid) {
        <div class="card biz-card" [class.biz-card--active]="biz.uuid === authStore.activeBusinessUuid()">
          <div class="card__body">
            <div class="biz-card__header">
              <div class="biz-card__icon">{{ (biz.name_en || biz.name_bn || 'B').charAt(0) }}</div>
              <div>
                <h3 class="biz-card__name">{{ biz.name_en || biz.name_bn || 'Unnamed' }}</h3>
                @if (biz.name_bn && biz.name_en) {
                  <p class="biz-card__name-alt">{{ biz.name_bn }}</p>
                }
              </div>
            </div>
            @if (biz.phone) {
              <p class="biz-card__detail">Phone: {{ biz.phone }}</p>
            }
            @if (biz.uuid === authStore.activeBusinessUuid()) {
              <span class="badge badge--success mt-2">Active</span>
            }
            <div class="biz-card__actions mt-2">
              @if (biz.uuid !== authStore.activeBusinessUuid()) {
                <button class="btn btn--sm btn--primary" (click)="switchBusiness(biz)">Switch to this</button>
              }
              <button class="btn btn--sm btn--ghost" (click)="editBusiness(biz)">Edit</button>
            </div>
          </div>
        </div>
      } @empty {
        <div class="card">
          <div class="card__body">
            <p class="text-muted">No businesses found. Create one to get started.</p>
          </div>
        </div>
      }
    </div>
  `,
  styles: `
    @use '../../../styles/abstracts/variables' as *;

    .biz-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 1rem;
    }

    .biz-card {
      transition: border-color $transition-fast;
      &--active { border-left: 3px solid $color-primary; }
    }

    .biz-card__header {
      display: flex;
      align-items: center;
      gap: $space-3;
      margin-bottom: $space-2;
    }

    .biz-card__icon {
      width: 40px;
      height: 40px;
      border-radius: $radius-md;
      background: $color-primary-50;
      color: $color-primary;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: $font-size-lg;
      flex-shrink: 0;
    }

    .biz-card__name {
      font-size: $font-size-md;
      font-weight: 600;
      margin: 0;
    }

    .biz-card__name-alt {
      font-size: $font-size-sm;
      color: $color-text-secondary;
      margin: 0;
    }

    .biz-card__detail {
      font-size: $font-size-sm;
      color: $color-text-secondary;
      margin: $space-1 0;
    }

    .biz-card__actions {
      display: flex;
      gap: $space-2;
    }

    .biz-form {
      display: flex;
      flex-direction: column;
      gap: $space-4;
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: $space-4;
      @media (max-width: 640px) {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class BusinessListComponent implements OnInit {
  authStore = inject(AuthStore);
  private api = inject(ApiService);
  private pouchDb = inject(PouchDbService);
  private bizSwitch = inject(BusinessSwitchService);

  businesses = signal<Business[]>([]);
  showForm = signal(false);
  editingBiz = signal<Business | null>(null);
  formLoading = signal(false);
  formError = signal('');

  formNameEn = '';
  formNameBn = '';
  formPhone = '';
  formAddress = '';

  ngOnInit(): void {
    this.loadBusinesses();
  }

  async loadBusinesses(): Promise<void> {
    try {
      const list = await firstValueFrom(this.api.get<Business[]>('/businesses'));
      this.businesses.set(list);
      this.authStore.setBusinesses(list);
      // Cache in PouchDB for offline access
      for (const biz of list) {
        await this.pouchDb.put(ETables.BUSINESS, biz.uuid, biz as unknown as Record<string, unknown>);
      }
    } catch {
      // API failed — load from PouchDB
      try {
        const db = this.pouchDb.getDatabase();
        const result = await db.allDocs({
          include_docs: true,
          startkey: ETables.BUSINESS + '::',
          endkey: ETables.BUSINESS + '::\ufff0',
        });
        const bizDocs = result.rows
          .filter((r) => r.doc)
          .map((r) => r.doc as unknown as Business);
        this.businesses.set(bizDocs);
        this.authStore.setBusinesses(bizDocs);
      } catch {
        this.businesses.set(this.authStore.businesses());
      }
    }
  }

  async switchBusiness(biz: Business): Promise<void> {
    await this.bizSwitch.switchTo(biz.uuid);
  }

  editBusiness(biz: Business): void {
    this.editingBiz.set(biz);
    this.formNameEn = biz.name_en || '';
    this.formNameBn = biz.name_bn || '';
    this.formPhone = biz.phone || '';
    this.formAddress = '';
    this.showForm.set(true);
  }

  cancelForm(): void {
    this.showForm.set(false);
    this.editingBiz.set(null);
    this.formNameEn = '';
    this.formNameBn = '';
    this.formPhone = '';
    this.formAddress = '';
    this.formError.set('');
  }

  saveBusiness(): void {
    if (!this.formNameEn && !this.formNameBn) {
      this.formError.set('At least one business name is required');
      return;
    }

    this.formLoading.set(true);
    this.formError.set('');

    const body = {
      name_en: this.formNameEn || null,
      name_bn: this.formNameBn || null,
      phone: this.formPhone || null,
      address: {
        display_address: this.formAddress || null,
        city: null,
        district: null,
        country_code: 'BD',
      },
    };

    const editing = this.editingBiz();
    const req = editing
      ? this.api.put<Business>(`/businesses/${editing.uuid}`, body)
      : this.api.post<Business>('/businesses', body);

    req.subscribe({
      next: () => {
        this.formLoading.set(false);
        this.cancelForm();
        this.loadBusinesses();
      },
      error: (err) => {
        this.formError.set(err.message || 'Failed to save business');
        this.formLoading.set(false);
      },
    });
  }
}
