import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { CatalogStore } from '../../core/stores/catalog.store';
import { SearchInputComponent } from '../../shared/components/search-input/search-input.component';


@Component({
  selector: 'gonok-reorder-alerts',
  standalone: true,
  imports: [TranslateModule, SearchInputComponent],
  template: `
    <div class="page-header">
      <h1 class="page-header__title">{{ 'reorder.title' | translate }}</h1>
    </div>

    <!-- Summary Cards -->
    <div class="summary-cards">
      <div class="summary-card">
        <div class="summary-card__label">{{ 'reorder.title' | translate }}</div>
        <div class="summary-card__value" [class.summary-card__value--danger]="catalogStore.lowStockCount() > 0">
          {{ catalogStore.lowStockCount() }}
        </div>
      </div>
      <div class="summary-card">
        <div class="summary-card__label">{{ 'reorder.critical' | translate }} (0)</div>
        <div class="summary-card__value summary-card__value--danger">{{ criticalCount() }}</div>
      </div>
      <div class="summary-card">
        <div class="summary-card__label">{{ 'reorder.low_stock' | translate }}</div>
        <div class="summary-card__value summary-card__value--warning">{{ lowCount() }}</div>
      </div>
    </div>

    <!-- Search & Filter -->
    <div class="filter-row">
      <gonok-search-input
        placeholder="Search product..."
        (searchChange)="searchTerm.set($event)"
      />
      <select class="form-input filter-select" (change)="categoryFilter.set($any($event.target).value)">
        <option value="">{{ 'report.all_categories' | translate }}</option>
        @for (cat of catalogStore.categories(); track cat.uuid) {
          <option [value]="cat.uuid">{{ cat.name }}</option>
        }
      </select>
    </div>

    <!-- Table -->
    <div class="table-wrapper">
      <table class="table">
        <thead>
          <tr>
            <th>{{ 'base.name' | translate }}</th>
            <th>Code</th>
            <th class="text-right">{{ 'reorder.current_stock' | translate }}</th>
            <th class="text-right">{{ 'reorder.reorder_level' | translate }}</th>
            <th class="text-right">{{ 'reorder.deficit' | translate }}</th>
            <th class="text-right">{{ 'reorder.reorder_quantity' | translate }}</th>
            <th>{{ 'base.action' | translate }}</th>
          </tr>
        </thead>
        <tbody>
          @for (product of filteredProducts(); track product.uuid) {
            <tr [class.row--critical]="product.quantity <= 0">
              <td>{{ product.name }}</td>
              <td>{{ product.code || '-' }}</td>
              <td class="col-amount" [class.text-danger]="product.quantity <= 0">{{ product.quantity }}</td>
              <td class="col-amount">{{ product.reorder_level }}</td>
              <td class="col-amount text-danger">{{ product.quantity - product.reorder_level }}</td>
              <td class="col-amount">{{ product.reorder_quantity || '-' }}</td>
              <td>
                <button class="btn btn--sm btn--primary" (click)="goToPurchaseOrders()">
                  {{ 'reorder.create_po' | translate }}
                </button>
              </td>
            </tr>
          } @empty {
            <tr>
              <td colspan="7" class="text-center text-muted">{{ 'reorder.all_ok' | translate }}</td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
  styles: `
    @use '../../../styles/abstracts/variables' as *;

    .summary-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: $space-4;
      margin-bottom: $space-5;
    }

    .summary-card {
      background: $color-surface;
      border: 1px solid $color-border;
      border-radius: $radius-lg;
      padding: $space-4;
      text-align: center;

      &__label {
        font-size: $font-size-sm;
        color: $color-text-secondary;
        margin-bottom: $space-1;
      }

      &__value {
        font-size: $font-size-2xl;
        font-weight: $font-weight-bold;

        &--danger { color: $color-danger; }
        &--warning { color: $color-warning; }
      }
    }

    .filter-row {
      display: flex;
      gap: $space-3;
      margin-bottom: $space-4;
      flex-wrap: wrap;
    }

    .filter-select {
      min-width: 160px;
      max-width: 220px;
    }

    .text-danger { color: $color-danger; }

    .row--critical {
      background: rgba($color-danger, 0.05);
    }
  `,
})
export class ReorderAlertsComponent implements OnInit {
  catalogStore = inject(CatalogStore);
  private router = inject(Router);

  searchTerm = signal('');
  categoryFilter = signal('');

  criticalCount = computed(() =>
    this.catalogStore.lowStockProducts().filter((p) => p.quantity <= 0).length,
  );

  lowCount = computed(() =>
    this.catalogStore.lowStockProducts().filter((p) => p.quantity > 0).length,
  );

  filteredProducts = computed(() => {
    let products = this.catalogStore.lowStockProducts();
    const term = this.searchTerm().toLowerCase();
    if (term) {
      products = products.filter(
        (p) =>
          (p.name || '').toLowerCase().includes(term) ||
          (p.code || '').toLowerCase().includes(term),
      );
    }
    const cat = this.categoryFilter();
    if (cat) {
      products = products.filter((p) => p.category_uuid === cat);
    }
    return [...products].sort((a, b) => a.quantity - b.quantity);
  });

  ngOnInit(): void {
    if (!this.catalogStore.initialized()) this.catalogStore.loadAll();
  }

  goToPurchaseOrders(): void {
    this.router.navigate(['/purchase-orders']);
  }
}
