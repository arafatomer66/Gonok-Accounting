import { Component, inject, input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthStore } from '../../core/stores/auth.store';

interface NavItem {
  label: string;
  icon: string;
  route: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

@Component({
  selector: 'gonok-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <aside class="sidebar" [class.sidebar--collapsed]="collapsed()">
      <div class="sidebar__header">
        <div class="sidebar__logo">
          <span class="sidebar__logo-icon">গ</span>
          <span class="sidebar__logo-text">গণক</span>
        </div>
      </div>

      <nav class="sidebar__nav">
        @for (section of navSections; track section.title) {
          <div class="sidebar__section-title">{{ section.title }}</div>
          @for (item of section.items; track item.route) {
            <a
              class="sidebar__nav-item"
              [routerLink]="item.route"
              routerLinkActive="sidebar__nav-item--active"
              (click)="navClicked.emit()"
            >
              <span class="sidebar__nav-icon">{{ item.icon }}</span>
              <span class="sidebar__nav-label">{{ item.label }}</span>
            </a>
          }
        }
      </nav>

      <div class="sidebar__footer">
        @if (authStore.activeBusiness(); as biz) {
          <div class="sidebar__biz-name">
            {{ biz.name_en || biz.name_bn || 'Business' }}
          </div>
        }
      </div>
    </aside>
  `,
  styles: `
    @use '../../../styles/abstracts/variables' as *;

    .sidebar__logo-icon {
      width: 36px;
      height: 36px;
      background: linear-gradient(135deg, $color-primary 0%, $color-primary-dark 100%);
      color: white;
      border-radius: $radius-lg;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: $font-size-lg;
      flex-shrink: 0;
      box-shadow: 0 2px 8px rgba($color-primary, 0.3);
    }

    .sidebar__biz-name {
      font-size: $font-size-sm;
      color: $color-text-secondary;
      padding: $space-2 $space-3;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  `,
})
export class SidebarComponent {
  authStore = inject(AuthStore);

  collapsed = input(false);
  navClicked = output<void>();

  navSections: NavSection[] = [
    {
      title: 'Main',
      items: [
        { label: 'Dashboard', icon: '📊', route: '/dashboard' },
      ],
    },
    {
      title: 'Sales',
      items: [
        { label: 'Sales', icon: '🛒', route: '/sales' },
        { label: 'Sales Return', icon: '↩️', route: '/sales-return' },
        { label: 'Payment In', icon: '💰', route: '/payment-in' },
      ],
    },
    {
      title: 'Purchase',
      items: [
        { label: 'Purchase', icon: '📦', route: '/purchase' },
        { label: 'Purchase Return', icon: '↩️', route: '/purchase-return' },
        { label: 'Payment Out', icon: '💸', route: '/payment-out' },
      ],
    },
    {
      title: 'Master',
      items: [
        { label: 'Parties', icon: '👥', route: '/parties' },
        { label: 'Products', icon: '📋', route: '/products' },
        { label: 'Expenses', icon: '💳', route: '/expenses' },
      ],
    },
    {
      title: 'Others',
      items: [
        { label: 'Reports', icon: '📈', route: '/reports' },
        { label: 'Businesses', icon: '🏢', route: '/businesses' },
        { label: 'Settings', icon: '⚙️', route: '/settings' },
        { label: 'Users', icon: '👤', route: '/users' },
      ],
    },
  ];
}
