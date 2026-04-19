import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthStore } from '../../core/stores/auth.store';
import { ApiService } from '../../core/services/api.service';
import { StorageService } from '../../core/services/storage.service';

type ProfileTab = 'info' | 'business';

@Component({
  selector: 'gonok-profile',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="profile-page">
      <div class="profile-card">
        <!-- Avatar -->
        <div class="profile-avatar">
          <div class="avatar-circle">
            <span class="avatar-letter">{{ getInitial() }}</span>
          </div>
        </div>

        <h2 class="profile-name">{{ authStore.user()?.name }}</h2>
        <p class="profile-phone">{{ authStore.user()?.phone }}</p>

        <!-- Tabs -->
        <div class="profile-tabs">
          <button
            class="profile-tab"
            [class.profile-tab--active]="activeTab() === 'info'"
            (click)="activeTab.set('info')"
          >
            Account Info
          </button>
          <button
            class="profile-tab"
            [class.profile-tab--active]="activeTab() === 'business'"
            (click)="activeTab.set('business')"
          >
            Business Info
          </button>
        </div>

        <!-- Account Info Tab -->
        @if (activeTab() === 'info') {
          <div class="profile-form">
            <div class="form-group">
              <label class="form-label">Name</label>
              <div class="input-row">
                <span class="input-icon">👤</span>
                <input
                  class="form-input"
                  type="text"
                  [(ngModel)]="formName"
                  name="name"
                  placeholder="Your name"
                />
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Phone</label>
              <div class="input-row">
                <span class="input-icon">📱</span>
                <input
                  class="form-input form-input--disabled"
                  type="text"
                  [value]="authStore.user()?.phone"
                  disabled
                />
              </div>
              <small class="form-hint">Phone number cannot be changed</small>
            </div>

            <div class="form-group">
              <label class="form-label">Email</label>
              <div class="input-row">
                <span class="input-icon">@</span>
                <input
                  class="form-input"
                  type="email"
                  [(ngModel)]="formEmail"
                  name="email"
                  placeholder="Email address"
                />
              </div>
            </div>

            @if (formError()) {
              <p class="form-error">{{ formError() }}</p>
            }
            @if (formSuccess()) {
              <p class="form-success">{{ formSuccess() }}</p>
            }

            <button
              class="btn btn--primary btn--full"
              (click)="saveProfile()"
              [disabled]="saving()"
            >
              {{ saving() ? 'Saving...' : 'Save' }}
            </button>
          </div>
        }

        <!-- Business Info Tab -->
        @if (activeTab() === 'business') {
          <div class="profile-form">
            @if (authStore.activeBusiness(); as biz) {
              <div class="form-group">
                <label class="form-label">Business Name (English)</label>
                <div class="input-row">
                  <span class="input-icon">🏢</span>
                  <input
                    class="form-input"
                    type="text"
                    [(ngModel)]="formBizNameEn"
                    name="bizNameEn"
                    placeholder="Business name in English"
                  />
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Business Name (Bangla)</label>
                <div class="input-row">
                  <span class="input-icon">🏢</span>
                  <input
                    class="form-input"
                    type="text"
                    [(ngModel)]="formBizNameBn"
                    name="bizNameBn"
                    placeholder="ব্যবসার নাম বাংলায়"
                  />
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Business Phone</label>
                <div class="input-row">
                  <span class="input-icon">📞</span>
                  <input
                    class="form-input"
                    type="text"
                    [(ngModel)]="formBizPhone"
                    name="bizPhone"
                    placeholder="Business phone number"
                  />
                </div>
              </div>

              @if (bizError()) {
                <p class="form-error">{{ bizError() }}</p>
              }
              @if (bizSuccess()) {
                <p class="form-success">{{ bizSuccess() }}</p>
              }

              <button
                class="btn btn--primary btn--full"
                (click)="saveBusiness()"
                [disabled]="savingBiz()"
              >
                {{ savingBiz() ? 'Saving...' : 'Save' }}
              </button>
            } @else {
              <p class="text-muted">No active business selected.</p>
            }
          </div>
        }
      </div>
    </div>
  `,
  styles: `
    @use '../../../styles/abstracts/variables' as *;

    .profile-page {
      display: flex;
      justify-content: center;
      padding: $space-6 $space-4;
    }

    .profile-card {
      width: 100%;
      max-width: 520px;
      background: $color-surface;
      border-radius: $radius-xl;
      box-shadow: $shadow-md;
      padding: $space-8 $space-6;
      text-align: center;
    }

    .profile-avatar {
      display: flex;
      justify-content: center;
      margin-bottom: $space-4;
    }

    .avatar-circle {
      width: 100px;
      height: 100px;
      border-radius: 50%;
      background: linear-gradient(135deg, $color-primary 0%, $color-primary-dark 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 16px rgba($color-primary, 0.3);
    }

    .avatar-letter {
      font-size: 40px;
      font-weight: $font-weight-bold;
      color: white;
      text-transform: uppercase;
    }

    .profile-name {
      font-size: $font-size-xl;
      font-weight: $font-weight-bold;
      color: $color-text;
      margin: 0 0 $space-1;
    }

    .profile-phone {
      font-size: $font-size-sm;
      color: $color-text-secondary;
      margin: 0 0 $space-6;
    }

    .profile-tabs {
      display: flex;
      border: 1px solid $color-border;
      border-radius: $radius-xl;
      overflow: hidden;
      margin-bottom: $space-6;
    }

    .profile-tab {
      flex: 1;
      padding: $space-3 $space-4;
      font-size: $font-size-sm;
      font-weight: $font-weight-semibold;
      border: none;
      cursor: pointer;
      background: transparent;
      color: $color-text-secondary;
      transition: all 150ms ease;

      &--active {
        background: $color-primary;
        color: white;
      }
    }

    .profile-form {
      text-align: left;
    }

    .form-group {
      margin-bottom: $space-5;
    }

    .input-row {
      display: flex;
      align-items: center;
      background: $color-gray-50;
      border-radius: $radius-lg;
      overflow: hidden;
    }

    .input-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 44px;
      height: 44px;
      font-size: $font-size-base;
      color: $color-primary;
      flex-shrink: 0;
    }

    .input-row .form-input {
      border: none;
      background: transparent;
      border-radius: 0;
      padding-left: 0;

      &:focus {
        box-shadow: none;
      }
    }

    .form-input--disabled {
      color: $color-text-secondary;
      cursor: not-allowed;
    }

    .form-hint {
      display: block;
      font-size: $font-size-xs;
      color: $color-text-secondary;
      margin-top: $space-1;
      padding-left: $space-1;
    }

    .btn--full {
      width: 100%;
      margin-top: $space-2;
    }

    .form-success {
      color: $color-success;
      font-size: $font-size-sm;
      margin-bottom: $space-3;
    }

    .text-muted {
      color: $color-text-secondary;
      text-align: center;
    }
  `,
})
export class ProfileComponent implements OnInit {
  authStore = inject(AuthStore);
  private api = inject(ApiService);
  private storage = inject(StorageService);

  activeTab = signal<ProfileTab>('info');
  saving = signal(false);
  savingBiz = signal(false);
  formError = signal('');
  formSuccess = signal('');
  bizError = signal('');
  bizSuccess = signal('');

  formName = '';
  formEmail = '';
  formBizNameEn = '';
  formBizNameBn = '';
  formBizPhone = '';

  ngOnInit(): void {
    const user = this.authStore.user();
    if (user) {
      this.formName = user.name || '';
    }
    const biz = this.authStore.activeBusiness();
    if (biz) {
      this.formBizNameEn = biz.name_en || '';
      this.formBizNameBn = biz.name_bn || '';
      this.formBizPhone = biz.phone || '';
    }
  }

  getInitial(): string {
    const name = this.authStore.user()?.name;
    return name ? name.charAt(0).toUpperCase() : '?';
  }

  async saveProfile(): Promise<void> {
    const name = this.formName.trim();
    if (!name) {
      this.formError.set('Name is required');
      return;
    }

    this.saving.set(true);
    this.formError.set('');
    this.formSuccess.set('');

    try {
      await this.api.put('/auth/profile', {
        name,
        email: this.formEmail.trim() || null,
      }).toPromise();

      // Update local user data
      const user = this.authStore.user();
      if (user) {
        const updated = { ...user, name };
        this.storage.setUser(updated);
        this.authStore.updateUser(updated);
      }
      this.formSuccess.set('Profile updated successfully');
    } catch {
      this.formError.set('Failed to update profile. Changes saved locally.');
      // Still update locally even if API fails (offline-first)
      const user = this.authStore.user();
      if (user) {
        const updated = { ...user, name };
        this.storage.setUser(updated);
        this.authStore.updateUser(updated);
      }
      this.formSuccess.set('Profile updated locally');
      this.formError.set('');
    }
    this.saving.set(false);
  }

  async saveBusiness(): Promise<void> {
    const nameEn = this.formBizNameEn.trim();
    if (!nameEn) {
      this.bizError.set('Business name (English) is required');
      return;
    }

    this.savingBiz.set(true);
    this.bizError.set('');
    this.bizSuccess.set('');

    const biz = this.authStore.activeBusiness();
    if (!biz) return;

    try {
      await this.api.put(`/businesses/${biz.uuid}`, {
        name_en: nameEn,
        name_bn: this.formBizNameBn.trim() || null,
        phone: this.formBizPhone.trim() || null,
      }).toPromise();

      this.authStore.updateBusiness(biz.uuid, {
        name_en: nameEn,
        name_bn: this.formBizNameBn.trim() || null,
        phone: this.formBizPhone.trim() || null,
      });
      this.bizSuccess.set('Business info updated successfully');
    } catch {
      this.bizError.set('Failed to update. Try again later.');
    }
    this.savingBiz.set(false);
  }
}
