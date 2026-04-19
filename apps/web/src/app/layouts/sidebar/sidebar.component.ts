import { Component, inject, input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AuthStore } from '../../core/stores/auth.store';

interface NavItem {
  labelKey: string;
  icon: string;
  route: string;
}

interface NavSection {
  titleKey: string;
  items: NavItem[];
}

@Component({
  selector: 'gonok-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, TranslateModule],
  template: `
    <aside class="sidebar" [class.sidebar--collapsed]="collapsed()">
      <div class="sidebar__header">
        <div class="sidebar__logo">
          <span class="sidebar__logo-icon">গ</span>
          <span class="sidebar__logo-text">গণক</span>
        </div>
      </div>

      <nav class="sidebar__nav">
        @for (section of navSections; track section.titleKey) {
          <div class="sidebar__section-title">{{ section.titleKey | translate }}</div>
          @for (item of section.items; track item.route) {
            <a
              class="sidebar__nav-item"
              [routerLink]="item.route"
              routerLinkActive="sidebar__nav-item--active"
              (click)="navClicked.emit()"
            >
              <span class="sidebar__nav-icon">{{ item.icon }}</span>
              <span class="sidebar__nav-label">{{ item.labelKey | translate }}</span>
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
      titleKey: 'menu.main',
      items: [
        { labelKey: 'menu.dashboard', icon: '📊', route: '/dashboard' },
        { labelKey: 'menu.pos', icon: '🖥️', route: '/pos' },
      ],
    },
    {
      titleKey: 'menu.sales_section',
      items: [
        { labelKey: 'menu.sales', icon: '🛒', route: '/sales' },
        { labelKey: 'menu.quotations', icon: '📄', route: '/quotations' },
        { labelKey: 'menu.deliveries', icon: '🚚', route: '/deliveries' },
        { labelKey: 'menu.sales_return', icon: '↩️', route: '/sales-return' },
        { labelKey: 'menu.payment_in', icon: '💰', route: '/payment-in' },
      ],
    },
    {
      titleKey: 'menu.purchase_section',
      items: [
        { labelKey: 'menu.purchase', icon: '📦', route: '/purchase' },
        { labelKey: 'menu.purchase_return', icon: '↩️', route: '/purchase-return' },
        { labelKey: 'menu.payment_out', icon: '💸', route: '/payment-out' },
      ],
    },
    {
      titleKey: 'menu.master',
      items: [
        { labelKey: 'menu.parties', icon: '👥', route: '/parties' },
        { labelKey: 'menu.products', icon: '📋', route: '/products' },
        { labelKey: 'menu.expenses', icon: '💳', route: '/expenses' },
        { labelKey: 'menu.recurring_expenses', icon: '🔄', route: '/recurring-expenses' },
        { labelKey: 'menu.payroll', icon: '💼', route: '/payroll' },
      ],
    },
    {
      titleKey: 'menu.finance',
      items: [
        { labelKey: 'menu.due_list', icon: '📑', route: '/due-list' },
        { labelKey: 'menu.cash_adjustment', icon: '💵', route: '/cash-adjustment' },
        { labelKey: 'menu.bank', icon: '🏦', route: '/bank' },
      ],
    },
    {
      titleKey: 'menu.others',
      items: [
        { labelKey: 'menu.reports', icon: '📈', route: '/reports' },
        { labelKey: 'menu.import', icon: '📂', route: '/import' },
        { labelKey: 'menu.branches', icon: '🏬', route: '/branches' },
        { labelKey: 'menu.businesses', icon: '🏢', route: '/businesses' },
        { labelKey: 'menu.backup', icon: '💾', route: '/backup' },
        { labelKey: 'menu.activity_log', icon: '📝', route: '/activity-log' },
        { labelKey: 'menu.settings', icon: '⚙️', route: '/settings' },
        { labelKey: 'menu.users', icon: '👤', route: '/users' },
      ],
    },
  ];
}
