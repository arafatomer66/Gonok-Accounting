import { Component, inject, computed, signal, OnInit } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CatalogStore } from '../../../core/stores/catalog.store';
import { SearchInputComponent } from '../../../shared/components/search-input/search-input.component';

@Component({
  selector: 'gonok-stock-summary',
  standalone: true,
  imports: [DecimalPipe, FormsModule, RouterLink, SearchInputComponent],
  template: `
    <div class="page-header">
      <a routerLink="../" class="btn btn--ghost btn--sm">&larr; Reports</a>
      <h1 class="page-header__title">Stock Summary</h1>
    </div>

    <div class="filter-bar">
      <div class="form-group form-group--wide">
        <gonok-search-input
          placeholder="Search products..."
          (searchChange)="searchTerm.set($event)"
        />
      </div>
      <div class="form-group">
        <label class="form-label">Category</label>
        <select class="form-input" [(ngModel)]="categoryFilter">
          <option value="">All Categories</option>
          @for (cat of catalogStore.categories(); track cat.uuid) {
            <option [value]="cat.uuid">{{ cat.name }}</option>
          }
        </select>
      </div>
    </div>

    <div class="table-wrapper">
      <table class="table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Code</th>
            <th>Category</th>
            <th class="col-amount">Qty</th>
            <th class="col-amount">Purchase Price</th>
            <th class="col-amount">Sales Price</th>
            <th class="col-amount">Stock Value</th>
          </tr>
        </thead>
        <tbody>
          @for (product of filteredProducts(); track product.uuid) {
            <tr>
              <td>{{ product.name }}</td>
              <td>{{ product.code || '-' }}</td>
              <td>{{ getCategoryName(product.category_uuid) }}</td>
              <td class="col-amount" [class.text-danger]="product.quantity <= 0">{{ product.quantity | number:'1.0-2' }}</td>
              <td class="col-amount">&#2547;{{ product.purchase_price | number:'1.2-2' }}</td>
              <td class="col-amount">&#2547;{{ product.sales_price | number:'1.2-2' }}</td>
              <td class="col-amount">&#2547;{{ (product.quantity * product.purchase_price) | number:'1.2-2' }}</td>
            </tr>
          } @empty {
            <tr>
              <td colspan="7" class="text-center text-muted">No products found.</td>
            </tr>
          }
        </tbody>
      </table>
    </div>

    <div class="summary-bar">
      <div class="summary-item">
        <span class="summary-label">Products</span>
        <span class="summary-value">{{ filteredProducts().length }}</span>
      </div>
      <div class="summary-item">
        <span class="summary-label">Total Quantity</span>
        <span class="summary-value">{{ totalQuantity() | number:'1.0-2' }}</span>
      </div>
      <div class="summary-item">
        <span class="summary-label">Stock Value (Cost)</span>
        <span class="summary-value">&#2547;{{ totalStockValue() | number:'1.2-2' }}</span>
      </div>
      <div class="summary-item">
        <span class="summary-label">Stock Value (Sale)</span>
        <span class="summary-value summary-value--success">&#2547;{{ totalSalesValue() | number:'1.2-2' }}</span>
      </div>
    </div>
  `,
  styles: `
    @use '../../../../styles/abstracts/variables' as *;

    .filter-bar {
      display: flex;
      gap: $space-4;
      margin-bottom: $space-4;
      flex-wrap: wrap;
      align-items: flex-end;

      .form-group {
        min-width: 180px;
        flex: 1;
        max-width: 250px;
      }

      .form-group--wide {
        max-width: 350px;
      }
    }

    .text-center { text-align: center; }
    .text-muted { color: $color-text-secondary; }
    .text-danger { color: $color-danger; }

    .summary-bar {
      display: flex;
      gap: $space-6;
      padding: $space-4;
      background: $color-gray-50;
      border-radius: $radius-md;
      margin-top: $space-4;
      flex-wrap: wrap;
    }

    .summary-item {
      display: flex;
      flex-direction: column;
      gap: $space-1;
    }

    .summary-label {
      font-size: $font-size-sm;
      color: $color-text-secondary;
    }

    .summary-value {
      font-size: $font-size-lg;
      font-weight: $font-weight-semibold;
    }

    .summary-value--success { color: $color-success; }
  `,
})
export class StockSummaryComponent implements OnInit {
  catalogStore = inject(CatalogStore);

  searchTerm = signal('');
  categoryFilter = signal('');

  filteredProducts = computed(() => {
    let products = this.catalogStore.products();
    const term = this.searchTerm().toLowerCase();
    const category = this.categoryFilter();

    if (term) {
      products = products.filter(
        (p) =>
          (p.name || '').toLowerCase().includes(term) ||
          (p.code && p.code.toLowerCase().includes(term)),
      );
    }
    if (category) {
      products = products.filter((p) => p.category_uuid === category);
    }
    return [...products].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  });

  totalQuantity = computed(() =>
    this.filteredProducts().reduce((s, p) => s + (p.quantity || 0), 0),
  );
  totalStockValue = computed(() =>
    this.filteredProducts().reduce(
      (s, p) => s + (p.quantity || 0) * (p.purchase_price || 0),
      0,
    ),
  );
  totalSalesValue = computed(() =>
    this.filteredProducts().reduce(
      (s, p) => s + (p.quantity || 0) * (p.sales_price || 0),
      0,
    ),
  );

  ngOnInit(): void {
    if (!this.catalogStore.initialized()) this.catalogStore.loadAll();
  }

  getCategoryName(uuid: string | null): string {
    if (!uuid) return '-';
    const cat = this.catalogStore.categories().find((c) => c.uuid === uuid);
    return cat?.name || '-';
  }
}
