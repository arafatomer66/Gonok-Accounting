import { Component, inject, input, output, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AuthStore } from '../../core/stores/auth.store';
import { SyncService } from '../../core/services/sync.service';
import { ConnectionService } from '../../core/services/connection.service';
import { BusinessSwitchService } from '../../core/services/business-switch.service';
import { BranchStore } from '../../core/stores/branch.store';

@Component({
  selector: 'gonok-navbar',
  standalone: true,
  imports: [TranslateModule, RouterLink],
  template: `
    <header class="navbar" [class.navbar--sidebar-collapsed]="sidebarCollapsed()">
      <div class="navbar__left">
        <button class="navbar__menu-btn" (click)="menuToggle.emit()">☰</button>
        <h2 class="navbar__title">{{ pageTitle() }}</h2>
      </div>

      <div class="navbar__right">
        <!-- Search shortcut hint -->
        <button class="navbar__search-hint" (click)="openSearch()">
          <span>🔍</span>
          <span class="navbar__search-text">Search...</span>
          <kbd>⌘K</kbd>
        </button>

        <!-- Sync status -->
        <span class="navbar__sync" [class]="'navbar__sync--' + syncService.status()">
          {{ syncLabel() }}
        </span>

        <!-- Online/Offline -->
        @if (!connection.isOnline()) {
          <span class="badge badge--warning">{{ 'sync.offline' | translate }}</span>
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

        <!-- Branch selector -->
        @if (branchStore.hasBranches()) {
          <select
            class="navbar__branch-select"
            [value]="branchStore.activeBranchUuid()"
            (change)="onBranchChange($event)"
          >
            @for (branch of branchStore.branches(); track branch.uuid) {
              <option [value]="branch.uuid">{{ branch.name }}</option>
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
              <a class="navbar__dropdown-item" routerLink="/profile" (click)="showUserMenu.set(false)">Profile</a>
              <button class="navbar__dropdown-item" (click)="logout()">{{ 'home.logout' | translate }}</button>
            </div>
          }
        </div>
      </div>
    </header>
  `,
  styles: `
    @use '../../../styles/abstracts/variables' as *;

    .navbar__search-hint {
      display: flex;
      align-items: center;
      gap: $space-2;
      padding: $space-1 $space-3;
      border: 1px solid $color-border;
      border-radius: $radius-lg;
      background: $color-gray-50;
      cursor: pointer;
      font-size: $font-size-sm;
      color: $color-text-secondary;
      transition: all $transition-fast;

      &:hover { border-color: $color-primary; background: $color-surface; }

      kbd {
        font-size: 10px;
        padding: 1px 5px;
        background: $color-surface;
        border: 1px solid $color-gray-300;
        border-radius: 3px;
        font-family: monospace;
        color: $color-text-muted;
      }
    }

    .navbar__search-text {
      @media (max-width: 768px) { display: none; }
    }

    .navbar__sync {
      font-size: $font-size-xs;
      font-weight: $font-weight-semibold;
      padding: 3px $space-3;
      border-radius: $radius-md;

      &--synced { background: #dcfce7; color: #16a34a; }
      &--syncing { background: #dbeafe; color: #2563eb; }
      &--error { background: #fee2e2; color: #dc2626; }
      &--offline, &--paused { background: #f1f5f9; color: #64748b; }
      &--idle { background: #f1f5f9; color: #94a3b8; }
    }

    .navbar__biz-select {
      padding: 5px $space-3;
      border: 1px solid $color-border;
      border-radius: $radius-lg;
      font-size: $font-size-sm;
      background: $color-surface;
      max-width: 180px;
      transition: border-color 150ms ease;
      &:focus {
        outline: none;
        border-color: $color-primary;
        box-shadow: 0 0 0 3px rgba($color-primary, 0.12);
      }
    }

    .navbar__branch-select {
      padding: 5px $space-3;
      border: 1px solid $color-primary;
      border-radius: $radius-lg;
      font-size: $font-size-sm;
      background: rgba($color-primary, 0.05);
      color: $color-primary;
      font-weight: $font-weight-semibold;
      max-width: 160px;
      transition: border-color 150ms ease;
      &:focus {
        outline: none;
        box-shadow: 0 0 0 3px rgba($color-primary, 0.12);
      }
    }

    .navbar__user {
      position: relative;
    }

    .navbar__dropdown {
      position: absolute;
      top: calc(100% + 4px);
      right: 0;
      background: $color-surface;
      border: 1px solid $color-border;
      border-radius: $radius-xl;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.12);
      min-width: 200px;
      z-index: 200;
      overflow: hidden;
      animation: slide-up 150ms ease;
    }

    .navbar__dropdown-item {
      display: block;
      width: 100%;
      padding: $space-3 $space-4;
      text-align: left;
      font-size: $font-size-sm;
      font-weight: $font-weight-medium;
      color: $color-gray-700;
      cursor: pointer;
      transition: background 100ms ease;
      &:hover { background: $color-gray-50; }
    }

    .navbar__user-info {
      border-bottom: 1px solid $color-border;
      cursor: default;
      padding: $space-3 $space-4;
      small { display: block; color: $color-text-secondary; font-size: $font-size-xs; margin-top: 2px; }
      &:hover { background: transparent; }
    }

    @keyframes slide-up {
      from { transform: translateY(4px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
  `,
})
export class NavbarComponent {
  authStore = inject(AuthStore);
  branchStore = inject(BranchStore);
  syncService = inject(SyncService);
  connection = inject(ConnectionService);
  private router = inject(Router);

  sidebarCollapsed = input(false);
  pageTitle = input('Dashboard');
  currentLang = input('en');
  menuToggle = output<void>();
  toggleLang = output<void>();
  searchOpen = output<void>();

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

  onBranchChange(event: Event): void {
    const uuid = (event.target as HTMLSelectElement).value;
    this.branchStore.setActiveBranch(uuid);
  }

  onBusinessChange(event: Event): void {
    const uuid = (event.target as HTMLSelectElement).value;
    this.bizSwitch.switchTo(uuid);
  }

  openSearch(): void {
    this.searchOpen.emit();
  }

  logout(): void {
    this.showUserMenu.set(false);
    this.authStore.logout();
    this.router.navigate(['/login']);
  }
}
