import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { CatalogStore } from '../../core/stores/catalog.store';
import { BranchStore } from '../../core/stores/branch.store';
import { SearchInputComponent } from '../../shared/components/search-input/search-input.component';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { ProductFormComponent } from './product-form/product-form.component';
import { IProduct } from '@org/shared-types';

@Component({
  selector: 'gonok-products',
  standalone: true,
  imports: [
    DecimalPipe,
    SearchInputComponent,
    ConfirmDialogComponent,
    ProductFormComponent,
  ],
  template: `
    <div class="page-header">
      <h1 class="page-header__title">Products</h1>
      <button class="btn btn--primary" (click)="openForm()">+ New Product</button>
    </div>

    <gonok-search-input
      placeholder="Search by name or code..."
      (searchChange)="searchTerm.set($event)"
    />

    <div class="table-wrapper">
      <table class="table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Code</th>
            <th class="text-right">Sale Price</th>
            <th class="text-right">Purchase Price</th>
            <th class="text-right">Stock</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          @for (product of filteredProducts(); track product.uuid) {
            <tr>
              <td>{{ product.name }}</td>
              <td>{{ product.code || '-' }}</td>
              <td class="col-amount">{{ product.sales_price | number:'1.2-2' }}</td>
              <td class="col-amount">{{ product.purchase_price | number:'1.2-2' }}</td>
              <td class="col-amount">
                {{ product.quantity }}
                @if (product.reorder_level > 0 && product.quantity <= product.reorder_level) {
                  <span class="badge badge--danger badge--sm" style="margin-left:4px;font-size:10px;padding:1px 6px;">Low</span>
                }
                @if (branchStore.hasBranches() && product.stock_by_branch) {
                  <div class="branch-stock-breakdown">
                    @for (branch of branchStore.branches(); track branch.uuid) {
                      <span class="branch-stock-item">{{ branch.name }}: {{ product.stock_by_branch[branch.uuid] ?? 0 }}</span>
                    }
                  </div>
                }
              </td>
              <td>
                <span class="badge" [class.badge--success]="product.active" [class.badge--secondary]="!product.active">
                  {{ product.active ? 'Active' : 'Inactive' }}
                </span>
              </td>
              <td>
                <div class="action-btns">
                  <button class="btn btn--sm btn--ghost" (click)="editProduct(product)">Edit</button>
                  <button class="btn btn--sm btn--ghost btn--danger-text" (click)="confirmDelete(product)">Delete</button>
                </div>
              </td>
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
      Total Products: {{ catalogStore.products().length }} &middot;
      Total Stock: {{ catalogStore.totalStock() }} &middot;
      Stock Value: &#2547;{{ catalogStore.totalStockValue() | number:'1.2-2' }}
    </div>

    @if (showForm()) {
      <gonok-product-form
        [product]="editingProduct()"
        (saved)="onSaved()"
        (cancelled)="closeForm()"
      />
    }

    <gonok-confirm-dialog
      [visible]="showDeleteConfirm()"
      title="Delete Product"
      [message]="deleteMessage()"
      confirmLabel="Delete"
      variant="danger"
      (confirmed)="doDelete()"
      (cancelled)="showDeleteConfirm.set(false)"
    ></gonok-confirm-dialog>
  `,
  styles: `
    @use '../../../styles/abstracts/variables' as *;

    .action-btns {
      display: flex;
      gap: $space-1;
    }

    .btn--danger-text {
      color: $color-danger;
      &:hover { background: rgba($color-danger, 0.08); }
    }

    .text-center { text-align: center; }
    .text-muted { color: $color-text-secondary; }

    .summary-bar {
      margin-top: $space-4;
      padding: $space-3 $space-4;
      background: $color-gray-50;
      border-radius: $radius-md;
      font-size: $font-size-sm;
      color: $color-text-secondary;
    }

    .branch-stock-breakdown {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      margin-top: 2px;
    }

    .branch-stock-item {
      font-size: 10px;
      color: $color-text-secondary;
      background: $color-gray-100;
      padding: 1px 6px;
      border-radius: $radius-sm;
    }
  `,
})
export class ProductsComponent implements OnInit {
  catalogStore = inject(CatalogStore);
  branchStore = inject(BranchStore);

  searchTerm = signal('');
  showForm = signal(false);
  editingProduct = signal<IProduct | null>(null);
  showDeleteConfirm = signal(false);
  deletingProduct = signal<IProduct | null>(null);

  deleteMessage = computed(
    () => `Delete "${this.deletingProduct()?.name || ''}"? This cannot be undone.`,
  );

  filteredProducts = computed(() => {
    const term = this.searchTerm().toLowerCase();
    let products = this.catalogStore.products();
    if (term) {
      products = products.filter(
        (p) =>
          p.name?.toLowerCase().includes(term) ||
          p.code?.toLowerCase().includes(term),
      );
    }
    return [...products].sort((a, b) =>
      (a.name || '').localeCompare(b.name || '', 'en', { numeric: true }),
    );
  });

  ngOnInit(): void {
    if (!this.catalogStore.initialized()) {
      this.catalogStore.loadAll();
    }
  }

  openForm(): void {
    this.editingProduct.set(null);
    this.showForm.set(true);
  }

  editProduct(product: IProduct): void {
    this.editingProduct.set(product);
    this.showForm.set(true);
  }

  closeForm(): void {
    this.showForm.set(false);
    this.editingProduct.set(null);
  }

  onSaved(): void {
    this.closeForm();
  }

  confirmDelete(product: IProduct): void {
    this.deletingProduct.set(product);
    this.showDeleteConfirm.set(true);
  }

  async doDelete(): Promise<void> {
    const product = this.deletingProduct();
    if (product) {
      await this.catalogStore.deleteProduct(product.uuid);
    }
    this.showDeleteConfirm.set(false);
    this.deletingProduct.set(null);
  }
}
