import { Component, inject, input, output, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CatalogStore } from '../../../core/stores/catalog.store';
import { BranchStore } from '../../../core/stores/branch.store';
import { CategoryModalComponent } from '../category-modal/category-modal.component';
import { UnitModalComponent } from '../unit-modal/unit-modal.component';
import { IProduct, ICategory, IUnit } from '@org/shared-types';

@Component({
  selector: 'gonok-product-form',
  standalone: true,
  imports: [FormsModule, CategoryModalComponent, UnitModalComponent],
  template: `
    <div class="modal-backdrop" (click)="cancelled.emit()">
      <div class="modal modal--wide" (click)="$event.stopPropagation()">
        <div class="modal__header">
          <h3 class="modal__title">{{ product() ? 'Edit Product' : 'New Product' }}</h3>
          <button class="modal__close" (click)="cancelled.emit()">&times;</button>
        </div>
        <form (ngSubmit)="save()" class="modal__body">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Product Name *</label>
              <input class="form-input" type="text" [(ngModel)]="name" name="name" placeholder="Product name" required />
            </div>
            <div class="form-group">
              <label class="form-label">Code</label>
              <input class="form-input" type="text" [(ngModel)]="code" name="code" placeholder="SKU / Barcode" />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Category</label>
              <div class="input-with-action">
                <select class="form-input" [(ngModel)]="categoryUuid" name="categoryUuid">
                  <option value="">-- Select Category --</option>
                  @for (cat of catalogStore.categories(); track cat.uuid) {
                    <option [value]="cat.uuid">{{ cat.name }}</option>
                  }
                </select>
                <button class="btn btn--sm btn--ghost" type="button" (click)="showCategoryModal.set(true)">+</button>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Unit</label>
              <div class="input-with-action">
                <select class="form-input" [(ngModel)]="unit" name="unit">
                  <option value="">-- Select Unit --</option>
                  @for (u of catalogStore.units(); track u.uuid) {
                    <option [value]="u.shortname">{{ u.fullname }} ({{ u.shortname }})</option>
                  }
                </select>
                <button class="btn btn--sm btn--ghost" type="button" (click)="showUnitModal.set(true)">+</button>
              </div>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Purchase Price</label>
              <input class="form-input" type="number" [(ngModel)]="purchasePrice" name="purchasePrice" step="0.01" min="0" />
            </div>
            <div class="form-group">
              <label class="form-label">Sales Price</label>
              <input class="form-input" type="number" [(ngModel)]="salesPrice" name="salesPrice" step="0.01" min="0" />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">MRP Price</label>
              <input class="form-input" type="number" [(ngModel)]="mrpPrice" name="mrpPrice" step="0.01" min="0" />
            </div>
            <div class="form-group">
              <label class="form-label">{{ branchStore.hasBranches() ? 'Total Stock' : 'Opening Stock' }}</label>
              <input class="form-input" type="number" [(ngModel)]="stockCount" name="stockCount" step="1" min="0" [readonly]="branchStore.hasBranches() && !product()" />
            </div>
          </div>

          @if (branchStore.hasBranches() && !product()) {
            <div class="branch-alloc">
              <label class="form-label">Allocate Stock by Branch</label>
              @for (branch of branchStore.branches(); track branch.uuid) {
                <div class="branch-alloc__row">
                  <span class="branch-alloc__name">{{ branch.name }}</span>
                  <input
                    class="form-input form-input--sm"
                    type="number"
                    [ngModel]="branchStockMap[branch.uuid] || 0"
                    (ngModelChange)="setBranchStock(branch.uuid, $event)"
                    [name]="'branch_' + branch.uuid"
                    step="1"
                    min="0"
                  />
                </div>
              }
            </div>
          }

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Tax / VAT (%)</label>
              <input class="form-input" type="number" [(ngModel)]="itemWiseTax" name="itemWiseTax" step="0.01" min="0" />
            </div>
            <div class="form-group">
              <label class="form-label">Discount</label>
              <input class="form-input" type="number" [(ngModel)]="discount" name="discount" step="0.01" min="0" />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Reorder Level</label>
              <input class="form-input" type="number" [(ngModel)]="reorderLevel" name="reorderLevel" step="1" min="0" placeholder="0 = disabled" />
            </div>
            <div class="form-group">
              <label class="form-label">Reorder Qty</label>
              <input class="form-input" type="number" [(ngModel)]="reorderQuantity" name="reorderQuantity" step="1" min="0" />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Batch No.</label>
              <input class="form-input" type="text" [(ngModel)]="batchNo" name="batchNo" />
            </div>
            <div class="form-group">
              <label class="form-label">Serial No.</label>
              <input class="form-input" type="text" [(ngModel)]="serialNo" name="serialNo" />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Manufacturing Date</label>
              <input class="form-input" type="date" [(ngModel)]="mfgDate" name="mfgDate" />
            </div>
            <div class="form-group">
              <label class="form-label">Expiry Date</label>
              <input class="form-input" type="date" [(ngModel)]="expDate" name="expDate" />
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Description</label>
            <textarea class="form-input" [(ngModel)]="description" name="description" rows="2" placeholder="Optional description"></textarea>
          </div>

          <div class="form-group">
            <label class="form-check">
              <input type="checkbox" [(ngModel)]="active" name="active" />
              <span>Active</span>
            </label>
          </div>

          @if (error()) {
            <p class="form-error">{{ error() }}</p>
          }
        </form>
        <div class="modal__footer">
          <button class="btn btn--ghost" type="button" (click)="cancelled.emit()">Cancel</button>
          <button class="btn btn--primary" (click)="save()" [disabled]="saving()">
            {{ saving() ? 'Saving...' : 'Save' }}
          </button>
        </div>
      </div>
    </div>

    @if (showCategoryModal()) {
      <gonok-category-modal
        (created)="onCategoryCreated($event)"
        (closed)="showCategoryModal.set(false)"
      />
    }

    @if (showUnitModal()) {
      <gonok-unit-modal
        (created)="onUnitCreated($event)"
        (closed)="showUnitModal.set(false)"
      />
    }
  `,
  styles: `
    @use '../../../../styles/abstracts/variables' as *;

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: $space-4;
      margin-bottom: $space-4;
      @media (max-width: 640px) { grid-template-columns: 1fr; }
    }

    .form-group { margin-bottom: 0; }

    .input-with-action {
      display: flex;
      gap: $space-2;
      .form-input { flex: 1; }
    }

    .form-check {
      display: flex;
      align-items: center;
      gap: $space-2;
      cursor: pointer;
      input { width: 16px; height: 16px; }
    }

    .branch-alloc {
      margin-bottom: $space-4;
      padding: $space-3;
      background: $color-gray-50;
      border-radius: $radius-md;
    }

    .branch-alloc__row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: $space-1 0;
      .form-input--sm { width: 100px; text-align: right; }
    }

    .branch-alloc__name {
      font-size: $font-size-sm;
      font-weight: $font-weight-medium;
    }
  `,
})
export class ProductFormComponent implements OnInit {
  catalogStore = inject(CatalogStore);
  branchStore = inject(BranchStore);

  product = input<IProduct | null>(null);
  saved = output<void>();
  cancelled = output<void>();

  showCategoryModal = signal(false);
  showUnitModal = signal(false);
  saving = signal(false);
  error = signal('');

  name = '';
  code = '';
  categoryUuid = '';
  unit = '';
  purchasePrice = 0;
  salesPrice = 0;
  mrpPrice = 0;
  stockCount = 0;
  itemWiseTax = 0;
  discount = 0;
  batchNo = '';
  serialNo = '';
  mfgDate = '';
  expDate = '';
  reorderLevel = 0;
  reorderQuantity = 0;
  description = '';
  active = true;
  branchStockMap: Record<string, number> = {};

  setBranchStock(branchUuid: string, value: number): void {
    this.branchStockMap = { ...this.branchStockMap, [branchUuid]: value || 0 };
    this.stockCount = Object.values(this.branchStockMap).reduce((s, v) => s + v, 0);
  }

  ngOnInit(): void {
    const p = this.product();
    if (p) {
      this.name = p.name || '';
      this.code = p.code || '';
      this.categoryUuid = p.category_uuid || '';
      this.unit = p.unit || '';
      this.purchasePrice = p.purchase_price || 0;
      this.salesPrice = p.sales_price || 0;
      this.mrpPrice = p.mrp_price || 0;
      this.stockCount = p.stock_count || 0;
      this.itemWiseTax = p.item_wise_tax || 0;
      this.discount = p.discount || 0;
      this.batchNo = p.batch_no || '';
      this.serialNo = p.serial_no || '';
      this.mfgDate = p.mfg_date ? new Date(p.mfg_date).toISOString().split('T')[0] : '';
      this.expDate = p.exp_date ? new Date(p.exp_date).toISOString().split('T')[0] : '';
      this.reorderLevel = p.reorder_level || 0;
      this.reorderQuantity = p.reorder_quantity || 0;
      this.description = p.description || '';
      this.active = p.active;
    }
  }

  async save(): Promise<void> {
    if (!this.name.trim()) {
      this.error.set('Product name is required');
      return;
    }

    const editingUuid = this.product()?.uuid;
    const products = this.catalogStore.products();

    const nameDup = products.some(
      (p) =>
        p.uuid !== editingUuid &&
        p.name?.toLowerCase() === this.name.trim().toLowerCase(),
    );
    if (nameDup) {
      this.error.set('A product with this name already exists');
      return;
    }

    if (this.code.trim()) {
      const codeDup = products.some(
        (p) =>
          p.uuid !== editingUuid &&
          p.code?.toLowerCase() === this.code.trim().toLowerCase(),
      );
      if (codeDup) {
        this.error.set('A product with this code already exists');
        return;
      }
    }

    if (this.purchasePrice < 0 || this.salesPrice < 0 || this.mrpPrice < 0) {
      this.error.set('Prices cannot be negative');
      return;
    }

    if (this.salesPrice > 0 && this.purchasePrice > 0 && this.salesPrice < this.purchasePrice) {
      // Warning, not blocking — just flag it
    }

    if (this.stockCount < 0) {
      this.error.set('Stock count cannot be negative');
      return;
    }

    if (this.itemWiseTax < 0 || this.itemWiseTax > 100) {
      this.error.set('Tax must be between 0% and 100%');
      return;
    }

    if (this.discount < 0) {
      this.error.set('Discount cannot be negative');
      return;
    }

    if (this.mfgDate && this.expDate && new Date(this.mfgDate) >= new Date(this.expDate)) {
      this.error.set('Expiry date must be after manufacturing date');
      return;
    }

    this.saving.set(true);
    this.error.set('');

    const data: Partial<IProduct> = {
      name: this.name.trim(),
      code: this.code.trim() || null,
      category_uuid: this.categoryUuid || null,
      unit: this.unit || null,
      purchase_price: this.purchasePrice || 0,
      sales_price: this.salesPrice || 0,
      mrp_price: this.mrpPrice || 0,
      stock_count: this.stockCount || 0,
      item_wise_tax: this.itemWiseTax || 0,
      discount: this.discount || 0,
      batch_no: this.batchNo.trim() || null,
      serial_no: this.serialNo.trim() || null,
      mfg_date: this.mfgDate ? new Date(this.mfgDate).getTime() : null,
      exp_date: this.expDate ? new Date(this.expDate).getTime() : null,
      reorder_level: this.reorderLevel || 0,
      reorder_quantity: this.reorderQuantity || 0,
      description: this.description.trim() || null,
      active: this.active,
      stock_by_branch: this.branchStore.hasBranches() ? { ...this.branchStockMap } : {},
    };

    try {
      if (editingUuid) {
        await this.catalogStore.updateProduct(editingUuid, data);
      } else {
        await this.catalogStore.addProduct(data);
      }
      this.saved.emit();
    } catch (err) {
      this.error.set('Failed to save product');
      this.saving.set(false);
    }
  }

  onCategoryCreated(cat: ICategory): void {
    this.categoryUuid = cat.uuid;
    this.showCategoryModal.set(false);
  }

  onUnitCreated(u: IUnit): void {
    this.unit = u.shortname || '';
    this.showUnitModal.set(false);
  }
}
