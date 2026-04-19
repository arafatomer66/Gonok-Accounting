import { Component, inject, signal, HostListener, OnInit, ElementRef, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DecimalPipe, DatePipe } from '@angular/common';
import { CatalogStore } from '../../../core/stores/catalog.store';
import { TransactionStore } from '../../../core/stores/transaction.store';

interface SearchResult {
  type: 'product' | 'party' | 'transaction' | 'page';
  icon: string;
  title: string;
  subtitle: string;
  route?: string;
  data?: unknown;
}

@Component({
  selector: 'gonok-command-palette',
  standalone: true,
  imports: [FormsModule, DecimalPipe, DatePipe],
  template: `
    @if (isOpen()) {
      <div class="palette-backdrop" (click)="close()">
        <div class="palette" (click)="$event.stopPropagation()">
          <!-- Search Input -->
          <div class="palette__search">
            <span class="palette__search-icon">🔍</span>
            <input
              #searchInput
              class="palette__input"
              type="text"
              [(ngModel)]="query"
              name="q"
              placeholder="Search products, parties, invoices, pages..."
              (input)="onSearch()"
              (keydown.arrowdown)="moveSelection(1); $event.preventDefault()"
              (keydown.arrowup)="moveSelection(-1); $event.preventDefault()"
              (keydown.enter)="selectCurrent(); $event.preventDefault()"
              (keydown.escape)="close()"
              autocomplete="off"
            />
            <kbd class="palette__kbd">ESC</kbd>
          </div>

          <!-- Results -->
          <div class="palette__results" #resultsList>
            @if (query.length === 0) {
              <!-- Quick Navigation -->
              <div class="palette__group-label">Quick Navigation</div>
              @for (page of pages; track page.route; let i = $index) {
                <button
                  class="palette__item"
                  [class.palette__item--selected]="selectedIndex() === i"
                  (click)="navigateTo(page.route)"
                  (mouseenter)="selectedIndex.set(i)"
                >
                  <span class="palette__item-icon">{{ page.icon }}</span>
                  <div class="palette__item-text">
                    <span class="palette__item-title">{{ page.title }}</span>
                  </div>
                  <span class="palette__item-type">Page</span>
                </button>
              }
            } @else if (results().length > 0) {
              @for (result of results(); track $index; let i = $index) {
                @if (i === 0 || results()[i - 1].type !== result.type) {
                  <div class="palette__group-label">
                    {{ getGroupLabel(result.type) }}
                  </div>
                }
                <button
                  class="palette__item"
                  [class.palette__item--selected]="selectedIndex() === i"
                  (click)="selectResult(result)"
                  (mouseenter)="selectedIndex.set(i)"
                >
                  <span class="palette__item-icon">{{ result.icon }}</span>
                  <div class="palette__item-text">
                    <span class="palette__item-title">{{ result.title }}</span>
                    <span class="palette__item-subtitle">{{ result.subtitle }}</span>
                  </div>
                  <span class="palette__item-type">{{ result.type }}</span>
                </button>
              }
            } @else {
              <div class="palette__empty">No results for "{{ query }}"</div>
            }
          </div>

          <!-- Footer -->
          <div class="palette__footer">
            <span><kbd>↑↓</kbd> Navigate</span>
            <span><kbd>↵</kbd> Select</span>
            <span><kbd>ESC</kbd> Close</span>
          </div>
        </div>
      </div>
    }
  `,
  styles: `
    @use '../../../../styles/abstracts/variables' as *;

    .palette-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(4px);
      z-index: 1000;
      display: flex;
      justify-content: center;
      padding-top: 15vh;
      animation: fade-in 100ms ease;
    }

    .palette {
      width: 580px;
      max-width: 95vw;
      max-height: 480px;
      background: $color-surface;
      border-radius: $radius-xl;
      box-shadow: 0 25px 50px rgba(0, 0, 0, 0.2);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      animation: slide-down 150ms ease;
    }

    .palette__search {
      display: flex;
      align-items: center;
      padding: $space-3 $space-4;
      border-bottom: 1px solid $color-border;
      gap: $space-2;
    }

    .palette__search-icon {
      font-size: $font-size-lg;
      flex-shrink: 0;
    }

    .palette__input {
      flex: 1;
      border: none;
      outline: none;
      font-size: $font-size-md;
      background: transparent;
      &::placeholder { color: $color-text-muted; }
    }

    .palette__kbd {
      font-size: 10px;
      padding: 2px 6px;
      background: $color-gray-100;
      border: 1px solid $color-gray-300;
      border-radius: $radius-sm;
      color: $color-text-secondary;
      font-family: monospace;
    }

    .palette__results {
      flex: 1;
      overflow-y: auto;
      padding: $space-2;
    }

    .palette__group-label {
      font-size: $font-size-xs;
      font-weight: $font-weight-semibold;
      color: $color-text-muted;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: $space-2 $space-3;
      margin-top: $space-1;
    }

    .palette__item {
      display: flex;
      align-items: center;
      gap: $space-3;
      width: 100%;
      padding: $space-2 $space-3;
      border: none;
      background: transparent;
      border-radius: $radius-md;
      cursor: pointer;
      text-align: left;
      transition: background 80ms ease;

      &:hover, &--selected {
        background: $color-primary-50;
      }

      &--selected {
        outline: 2px solid $color-primary-200;
      }
    }

    .palette__item-icon {
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: $color-gray-100;
      border-radius: $radius-md;
      font-size: $font-size-base;
      flex-shrink: 0;
    }

    .palette__item-text {
      flex: 1;
      min-width: 0;
    }

    .palette__item-title {
      display: block;
      font-size: $font-size-sm;
      font-weight: $font-weight-medium;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .palette__item-subtitle {
      display: block;
      font-size: $font-size-xs;
      color: $color-text-secondary;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .palette__item-type {
      font-size: $font-size-xs;
      color: $color-text-muted;
      text-transform: capitalize;
      flex-shrink: 0;
    }

    .palette__empty {
      padding: $space-8 $space-4;
      text-align: center;
      color: $color-text-secondary;
      font-size: $font-size-sm;
    }

    .palette__footer {
      display: flex;
      gap: $space-5;
      padding: $space-2 $space-4;
      border-top: 1px solid $color-border;
      font-size: $font-size-xs;
      color: $color-text-muted;

      kbd {
        font-size: 10px;
        padding: 1px 4px;
        background: $color-gray-100;
        border: 1px solid $color-gray-300;
        border-radius: 3px;
        font-family: monospace;
        margin-right: 2px;
      }
    }

    @keyframes fade-in {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes slide-down {
      from { transform: translateY(-10px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
  `,
})
export class CommandPaletteComponent implements OnInit {
  private router = inject(Router);
  private catalogStore = inject(CatalogStore);
  private transactionStore = inject(TransactionStore);

  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;

  isOpen = signal(false);
  query = '';
  selectedIndex = signal(0);
  results = signal<SearchResult[]>([]);

  pages: { title: string; icon: string; route: string }[] = [
    { title: 'Dashboard', icon: '📊', route: '/dashboard' },
    { title: 'POS', icon: '🖥️', route: '/pos' },
    { title: 'Sales', icon: '🛒', route: '/sales' },
    { title: 'Purchase', icon: '📦', route: '/purchase' },
    { title: 'Products', icon: '📋', route: '/products' },
    { title: 'Parties', icon: '👥', route: '/parties' },
    { title: 'Expenses', icon: '💳', route: '/expenses' },
    { title: 'Quotations', icon: '📄', route: '/quotations' },
    { title: 'Payroll', icon: '💼', route: '/payroll' },
    { title: 'Recurring Expenses', icon: '🔄', route: '/recurring-expenses' },
    { title: 'Reports', icon: '📈', route: '/reports' },
    { title: 'Due List', icon: '📑', route: '/due-list' },
    { title: 'Settings', icon: '⚙️', route: '/settings' },
    { title: 'Backup', icon: '💾', route: '/backup' },
    { title: 'Import Data', icon: '📂', route: '/import' },
    { title: 'Activity Log', icon: '📝', route: '/activity-log' },
  ];

  ngOnInit(): void {
    // Stores may already be loaded from other components
  }

  @HostListener('document:keydown', ['$event'])
  handleKeydown(event: KeyboardEvent): void {
    // Cmd+K or Ctrl+K to open
    if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
      event.preventDefault();
      this.open();
    }
  }

  open(): void {
    this.query = '';
    this.selectedIndex.set(0);
    this.results.set([]);
    this.isOpen.set(true);

    // Focus input after render
    setTimeout(() => this.searchInput?.nativeElement?.focus(), 50);
  }

  close(): void {
    this.isOpen.set(false);
  }

  onSearch(): void {
    const q = this.query.trim().toLowerCase();
    if (!q) {
      this.results.set([]);
      this.selectedIndex.set(0);
      return;
    }

    const results: SearchResult[] = [];

    // Search pages
    const matchedPages = this.pages.filter((p) =>
      p.title.toLowerCase().includes(q),
    );
    for (const page of matchedPages) {
      results.push({
        type: 'page',
        icon: page.icon,
        title: page.title,
        subtitle: page.route,
        route: page.route,
      });
    }

    // Search products
    const products = this.catalogStore.products();
    const matchedProducts = products
      .filter((p) =>
        (p.name || '').toLowerCase().includes(q) ||
        (p.code || '').toLowerCase().includes(q),
      )
      .slice(0, 8);

    for (const p of matchedProducts) {
      results.push({
        type: 'product',
        icon: '📋',
        title: p.name || '',
        subtitle: `Price: ৳${p.sales_price} | Stock: ${p.quantity}${p.code ? ' | Code: ' + p.code : ''}`,
        route: '/products',
        data: p,
      });
    }

    // Search parties
    const parties = this.catalogStore.parties();
    const matchedParties = parties
      .filter((p) =>
        (p.name || '').toLowerCase().includes(q) ||
        (p.phone || '').toLowerCase().includes(q),
      )
      .slice(0, 8);

    for (const p of matchedParties) {
      results.push({
        type: 'party',
        icon: p.party_type === 'customer' ? '🧑' : '🏭',
        title: p.name || '',
        subtitle: `${p.party_type || ''} | Balance: ৳${p.current_balance || 0}${p.phone ? ' | ' + p.phone : ''}`,
        route: '/parties',
        data: p,
      });
    }

    // Search transactions (by invoice/order number)
    const transactions = this.transactionStore.transactions();
    const matchedTx = transactions
      .filter((t) =>
        (t.invoice_no || '').toLowerCase().includes(q) ||
        (t.order_number || '').toLowerCase().includes(q) ||
        (t.bill_no || '').toLowerCase().includes(q),
      )
      .slice(0, 6);

    for (const t of matchedTx) {
      const partyName = this.catalogStore.allParties().find((p) => p.uuid === t.party_uuid)?.name || '';
      results.push({
        type: 'transaction',
        icon: t.type === 'sales' ? '🛒' : t.type === 'purchase' ? '📦' : '💰',
        title: t.invoice_no || t.order_number || t.uuid.slice(0, 8),
        subtitle: `${t.type} | ৳${t.total_amount} | ${partyName}`,
        route: `/${t.type === 'sales' ? 'sales' : t.type === 'purchase' ? 'purchase' : t.type?.replace('_', '-') || 'sales'}`,
        data: t,
      });
    }

    this.results.set(results);
    this.selectedIndex.set(0);
  }

  moveSelection(delta: number): void {
    const max = this.query ? this.results().length : this.pages.length;
    if (max === 0) return;
    let idx = this.selectedIndex() + delta;
    if (idx < 0) idx = max - 1;
    if (idx >= max) idx = 0;
    this.selectedIndex.set(idx);
  }

  selectCurrent(): void {
    if (!this.query) {
      const page = this.pages[this.selectedIndex()];
      if (page) this.navigateTo(page.route);
      return;
    }
    const result = this.results()[this.selectedIndex()];
    if (result) this.selectResult(result);
  }

  selectResult(result: SearchResult): void {
    if (result.route) {
      this.router.navigate([result.route]);
    }
    this.close();
  }

  navigateTo(route: string): void {
    this.router.navigate([route]);
    this.close();
  }

  getGroupLabel(type: string): string {
    const labels: Record<string, string> = {
      page: 'Pages',
      product: 'Products',
      party: 'Parties',
      transaction: 'Transactions',
    };
    return labels[type] || type;
  }
}
