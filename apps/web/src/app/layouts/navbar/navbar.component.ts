import { Component, inject, input, output, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthStore } from '../../core/stores/auth.store';
import { SyncService } from '../../core/services/sync.service';
import { ConnectionService } from '../../core/services/connection.service';
import { BusinessSwitchService } from '../../core/services/business-switch.service';

@Component({
  selector: 'gonok-navbar',
  standalone: true,
  template: `
    <header class="navbar" [class.navbar--sidebar-collapsed]="sidebarCollapsed()">
      <div class="navbar__left">
        <button class="navbar__menu-btn" (click)="menuToggle.emit()">☰</button>
        <h2 class="navbar__title">{{ pageTitle() }}</h2>
      </div>

      <div class="navbar__right">
        <!-- Sync status -->
        <span class="navbar__sync" [class]="'navbar__sync--' + syncService.status()">
          {{ syncLabel() }}
        </span>

        <!-- Online/Offline -->
        @if (!connection.isOnline()) {
          <span class="badge badge--warning">Offline</span>
        }

        <!-- Business selector -->
        @if (authStore.businesses().length > 1) {
          <select
            class="navbar__biz-select"
            [value]="authStore.activeBusinessUuid()"
            (change)="onBusinessChange($event)"
          >
            @for (biz of authStore.businesses(); track biz.uuid) {
              <option [value]="biz.uuid">{{ biz.name_en || biz.name_bn }}</option>
            }
          </select>
        }

        <!-- Language toggle -->
        <button class="btn btn--ghost btn--sm" (click)="toggleLang.emit()">
          {{ currentLang() === 'bn' ? 'EN' : 'বাং' }}
        </button>

        <!-- User menu -->
        <div class="navbar__user">
          <button class="btn btn--ghost btn--sm" (click)="showUserMenu.set(!showUserMenu())">
            {{ authStore.user()?.name?.charAt(0) || '?' }}
          </button>
          @if (showUserMenu()) {
            <div class="navbar__dropdown">
              <div class="navbar__dropdown-item navbar__user-info">
                {{ authStore.user()?.name }}
                <small>{{ authStore.user()?.phone }}</small>
              </div>
              <button class="navbar__dropdown-item" (click)="logout()">Logout</button>
            </div>
          }
        </div>
      </div>
    </header>
  `,
  styles: `
    @use '../../../styles/abstracts/variables' as *;

    .navbar__sync {
      font-size: $font-size-xs;
      padding: 2px $space-2;
      border-radius: $radius-full;

      &--synced { background: #dcfce7; color: #16a34a; }
      &--syncing { background: #dbeafe; color: #2563eb; }
      &--error { background: #fee2e2; color: #dc2626; }
      &--offline, &--paused { background: #f3f4f6; color: #6b7280; }
      &--idle { background: #f3f4f6; color: #9ca3af; }
    }

    .navbar__biz-select {
      padding: 4px $space-2;
      border: 1px solid $color-border;
      border-radius: $radius-md;
      font-size: $font-size-sm;
      background: $color-surface;
      max-width: 180px;
    }

    .navbar__user {
      position: relative;
    }

    .navbar__dropdown {
      position: absolute;
      top: 100%;
      right: 0;
      margin-top: $space-1;
      background: $color-surface;
      border: 1px solid $color-border;
      border-radius: $radius-md;
      box-shadow: $shadow-md;
      min-width: 180px;
      z-index: 200;
    }

    .navbar__dropdown-item {
      display: block;
      width: 100%;
      padding: $space-2 $space-3;
      text-align: left;
      font-size: $font-size-sm;
      color: $color-gray-700;
      cursor: pointer;
      &:hover { background: $color-gray-50; }
    }

    .navbar__user-info {
      border-bottom: 1px solid $color-border;
      cursor: default;
      small { display: block; color: $color-text-secondary; font-size: $font-size-xs; }
      &:hover { background: transparent; }
    }
  `,
})
export class NavbarComponent {
  authStore = inject(AuthStore);
  syncService = inject(SyncService);
  connection = inject(ConnectionService);
  private router = inject(Router);

  sidebarCollapsed = input(false);
  pageTitle = input('Dashboard');
  currentLang = input('en');
  menuToggle = output<void>();
  toggleLang = output<void>();

  showUserMenu = signal(false);

  syncLabel(): string {
    const s = this.syncService.status();
    const map: Record<string, string> = {
      idle: '—', syncing: 'Syncing...', synced: 'Synced',
      paused: 'Paused', error: 'Sync Error', offline: 'Offline',
    };
    return map[s] || s;
  }

  private bizSwitch = inject(BusinessSwitchService);

  onBusinessChange(event: Event): void {
    const uuid = (event.target as HTMLSelectElement).value;
    this.bizSwitch.switchTo(uuid);
  }

  logout(): void {
    this.showUserMenu.set(false);
    this.authStore.logout();
    this.router.navigate(['/login']);
  }
}
