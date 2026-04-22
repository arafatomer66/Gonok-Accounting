import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DecimalPipe, DatePipe } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { PurchaseOrderStore } from '../../core/stores/purchase-order.store';
import { CatalogStore } from '../../core/stores/catalog.store';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { IPurchaseOrder, IPurchaseOrderItem, IGoodsReceiptNote } from '@org/shared-types';

interface FormItem {
  item_uuid: string;
  name: string;
  quantity: number;
  price: number;
  discount: number;
  total: number;
}

interface GrnFormItem {
  po_item_uuid: string;
  item_uuid: string;
  name: string;
  ordered_quantity: number;
  already_received: number;
  remaining: number;
  receiving_now: number;
}

@Component({
  selector: 'gonok-purchase-orders',
  standalone: true,
  imports: [FormsModule, DecimalPipe, DatePipe, TranslateModule, ConfirmDialogComponent],
  styleUrl: './purchase-orders.component.scss',
  template: `
    <div class="page-header">
      <h1 class="page-header__title">{{ 'po.title' | translate }}</h1>
      <button class="btn btn--primary" (click)="openForm()">+ {{ 'po.new' | translate }}</button>
    </div>

    <!-- Status Tabs -->
    <div class="status-tabs">
      @for (tab of statusTabs; track tab.value) {
        <button
          class="status-tab"
          [class.status-tab--active]="filterStatus() === tab.value"
          (click)="filterStatus.set(tab.value)"
        >
          {{ tab.labelKey | translate }} ({{ countByStatus(tab.value) }})
        </button>
      }
    </div>

    <!-- Summary Cards -->
    <div class="summary-grid">
      <div class="card card--stat">
        <div class="card__label">{{ 'po.open_orders' | translate }}</div>
        <div class="card__value">{{ poStore.openOrders().length }}</div>
      </div>
      <div class="card card--stat">
        <div class="card__label">{{ 'po.pending_grn' | translate }}</div>
        <div class="card__value">{{ poStore.sent().length + poStore.partiallyReceived().length }}</div>
      </div>
      <div class="card card--stat">
        <div class="card__label">{{ 'po.total_value' | translate }}</div>
        <div class="card__value">&#2547;{{ totalOpenValue() | number:'1.2-2' }}</div>
      </div>
    </div>

    <!-- List -->
    <div class="card">
      <div class="table-wrapper">
        <table class="table">
          <thead>
            <tr>
              <th>{{ 'po.po_no' | translate }}</th>
              <th>{{ 'base.date' | translate }}</th>
              <th>{{ 'po.supplier' | translate }}</th>
              <th>{{ 'po.expected_delivery' | translate }}</th>
              <th class="text-right">{{ 'transaction.total_amount' | translate }}</th>
              <th>{{ 'po.status' | translate }}</th>
              <th>{{ 'base.action' | translate }}</th>
            </tr>
          </thead>
          <tbody>
            @for (po of filteredOrders(); track po.uuid) {
              <tr>
                <td class="font-medium">{{ po.po_no }}</td>
                <td>{{ po.po_date | date:'dd/MM/yyyy' }}</td>
                <td>{{ getPartyName(po.party_uuid) }}</td>
                <td>{{ po.expected_delivery_date ? (po.expected_delivery_date | date:'dd/MM/yyyy') : '-' }}</td>
                <td class="text-right font-medium">&#2547;{{ po.total_amount | number:'1.2-2' }}</td>
                <td>
                  <span class="badge" [class]="'badge--' + po.status">{{ po.status | translate }}</span>
                </td>
                <td>
                  <div class="action-btns">
                    @if (po.status === 'draft' || po.status === 'sent') {
                      <button class="btn btn--sm btn--ghost" (click)="editPO(po)">{{ 'base.edit' | translate }}</button>
                    }
                    @if (po.status === 'sent' || po.status === 'partially_received') {
                      <button class="btn btn--sm btn--primary" (click)="openGrnModal(po)">{{ 'po.receive_goods' | translate }}</button>
                    }
                    @if ((po.status === 'received' || po.status === 'partially_received') && !po.converted_transaction_uuid) {
                      <button class="btn btn--sm btn--ghost" (click)="confirmConvert(po)">{{ 'po.convert_to_invoice' | translate }}</button>
                    }
                    @if (po.status !== 'received' && po.status !== 'cancelled') {
                      <button class="btn btn--sm btn--ghost" (click)="openStatusModal(po)">{{ 'po.change_status' | translate }}</button>
                    }
                    @if (po.status === 'draft' || po.status === 'cancelled') {
                      <button class="btn btn--sm btn--ghost text-danger" (click)="confirmDeletePO(po)">{{ 'base.yes_delete' | translate }}</button>
                    }
                  </div>
                </td>
              </tr>
            } @empty {
              <tr><td colspan="7" class="text-center text-muted">{{ 'po.no_orders' | translate }}</td></tr>
            }
          </tbody>
        </table>
      </div>
    </div>

    <!-- PO Form Modal -->
    @if (showForm()) {
      <div class="modal-backdrop" (click)="closeForm()">
        <div class="modal modal--wide" (click)="$event.stopPropagation()">
          <div class="modal__header">
            <h3>{{ editingUuid ? ('po.edit' | translate) : ('po.new' | translate) }}</h3>
            <button class="modal__close" (click)="closeForm()">&times;</button>
          </div>

          <div class="modal__body">
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">{{ 'po.supplier' | translate }} *</label>
                <select class="form-input" [(ngModel)]="formPartyUuid" name="party">
                  <option value="">{{ 'base.select' | translate }}</option>
                  @for (p of catalogStore.suppliers(); track p.uuid) {
                    <option [value]="p.uuid">{{ p.name }}</option>
                  }
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">{{ 'base.date' | translate }}</label>
                <input class="form-input" type="date" [(ngModel)]="formDate" name="date" />
              </div>
              <div class="form-group">
                <label class="form-label">{{ 'po.expected_delivery' | translate }}</label>
                <input class="form-input" type="date" [(ngModel)]="formExpectedDelivery" name="expectedDelivery" />
              </div>
            </div>

            <!-- Items -->
            <h4 class="items-heading">{{ 'po.items' | translate }}</h4>
            <div class="item-add-row">
              <select class="form-input" [(ngModel)]="selectedProductUuid" name="productSelect">
                <option value="">{{ 'po.select_product' | translate }}</option>
                @for (p of catalogStore.products(); track p.uuid) {
                  <option [value]="p.uuid">{{ p.name }} (&#2547;{{ p.purchase_price }})</option>
                }
              </select>
              <button class="btn btn--primary btn--sm" (click)="addItem()" [disabled]="!selectedProductUuid">+ Add</button>
            </div>

            @if (formItems.length > 0) {
              <div class="table-wrapper">
                <table class="table table--sm">
                  <thead>
                    <tr>
                      <th>{{ 'po.product' | translate }}</th>
                      <th class="text-right">{{ 'po.price' | translate }}</th>
                      <th class="text-right">{{ 'po.qty' | translate }}</th>
                      <th class="text-right">{{ 'transaction.discount' | translate }}</th>
                      <th class="text-right">{{ 'po.total' | translate }}</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (item of formItems; track $index; let i = $index) {
                      <tr>
                        <td>{{ item.name }}</td>
                        <td><input class="inline-input text-right" type="number" [(ngModel)]="item.price" [name]="'price'+i" (input)="recalcItem(i)" /></td>
                        <td><input class="inline-input text-right" type="number" [(ngModel)]="item.quantity" [name]="'qty'+i" min="1" (input)="recalcItem(i)" /></td>
                        <td><input class="inline-input text-right" type="number" [(ngModel)]="item.discount" [name]="'disc'+i" min="0" (input)="recalcItem(i)" /></td>
                        <td class="text-right font-medium">&#2547;{{ item.total | number:'1.2-2' }}</td>
                        <td><button class="btn btn--sm btn--ghost text-danger" (click)="removeItem(i)">&times;</button></td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">{{ 'transaction.discount' | translate }}</label>
                <input class="form-input" type="number" [(ngModel)]="formDiscount" name="discount" min="0" />
              </div>
              <div class="form-group">
                <label class="form-label">{{ 'po.notes' | translate }}</label>
                <input class="form-input" type="text" [(ngModel)]="formNotes" name="notes" />
              </div>
            </div>

            <div class="form-total">
              {{ 'po.total' | translate }}: &#2547;{{ formGrandTotal | number:'1.2-2' }}
            </div>

            @if (formError()) {
              <p class="form-error">{{ formError() }}</p>
            }
          </div>

          <div class="modal__footer">
            <button class="btn btn--ghost" (click)="closeForm()">{{ 'base.cancel' | translate }}</button>
            <button class="btn btn--primary" (click)="savePO()" [disabled]="saving()">
              {{ saving() ? 'Saving...' : ('base.save' | translate) }}
            </button>
          </div>
        </div>
      </div>
    }

    <!-- GRN Modal -->
    @if (showGrnModal()) {
      <div class="modal-backdrop" (click)="showGrnModal.set(false)">
        <div class="modal modal--wide" (click)="$event.stopPropagation()">
          <div class="modal__header">
            <h3>{{ 'po.receive_goods' | translate }} — {{ grnTargetPO()?.po_no }}</h3>
            <button class="modal__close" (click)="showGrnModal.set(false)">&times;</button>
          </div>

          <div class="modal__body">
            <!-- GRN History -->
            @if (grnHistory().length > 0) {
              <div class="grn-history">
                <h4>{{ 'po.grn_history' | translate }}</h4>
                @for (grn of grnHistory(); track grn.uuid) {
                  <div class="grn-history__item">
                    <span class="font-medium">{{ grn.grn_no }}</span>
                    <span>{{ grn.grn_date | date:'dd/MM/yyyy' }}</span>
                    <span>{{ grn.total_quantity }} items</span>
                  </div>
                }
              </div>
            }

            <h4>{{ 'po.receiving_now' | translate }}</h4>
            <div class="table-wrapper">
              <table class="table table--sm">
                <thead>
                  <tr>
                    <th>{{ 'po.product' | translate }}</th>
                    <th class="text-right">{{ 'po.ordered' | translate }}</th>
                    <th class="text-right">{{ 'po.already_received' | translate }}</th>
                    <th class="text-right">{{ 'po.remaining' | translate }}</th>
                    <th class="text-right">{{ 'po.receiving_qty' | translate }}</th>
                  </tr>
                </thead>
                <tbody>
                  @for (item of grnFormItems; track item.po_item_uuid; let i = $index) {
                    <tr>
                      <td>{{ item.name }}</td>
                      <td class="text-right">{{ item.ordered_quantity }}</td>
                      <td class="text-right">{{ item.already_received }}</td>
                      <td class="text-right">{{ item.remaining }}</td>
                      <td>
                        <input
                          class="inline-input text-right"
                          type="number"
                          [(ngModel)]="item.receiving_now"
                          [name]="'grn'+i"
                          min="0"
                          [max]="item.remaining"
                        />
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>

            @if (grnError()) {
              <p class="form-error">{{ grnError() }}</p>
            }
          </div>

          <div class="modal__footer">
            <button class="btn btn--ghost" (click)="showGrnModal.set(false)">{{ 'base.cancel' | translate }}</button>
            <button class="btn btn--primary" (click)="saveGrn()" [disabled]="savingGrn()">
              {{ savingGrn() ? 'Saving...' : ('po.receive_goods' | translate) }}
            </button>
          </div>
        </div>
      </div>
    }

    <!-- Status Change Modal -->
    @if (showStatusModal()) {
      <div class="modal-backdrop" (click)="showStatusModal.set(false)">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal__header">
            <h3>{{ 'po.change_status' | translate }}</h3>
            <button class="modal__close" (click)="showStatusModal.set(false)">&times;</button>
          </div>
          <div class="modal__body">
            <p>Current: <span class="badge" [class]="'badge--' + statusTarget()?.status">{{ statusTarget()?.status }}</span></p>
            <div class="status-options">
              @for (s of availableStatuses(); track s) {
                <button class="btn btn--outline status-option-btn" (click)="applyStatus(s)">{{ s }}</button>
              }
            </div>
          </div>
        </div>
      </div>
    }

    <!-- Convert Confirm -->
    <gonok-confirm-dialog
      [visible]="showConvertConfirm()"
      title="Convert to Invoice"
      [message]="'Convert ' + (convertTarget()?.po_no || '') + ' to a purchase invoice?'"
      confirmLabel="Convert"
      variant="primary"
      (confirmed)="doConvert()"
      (cancelled)="showConvertConfirm.set(false)"
    />

    <!-- Delete Confirm -->
    <gonok-confirm-dialog
      [visible]="showDeleteConfirm()"
      title="Delete Purchase Order"
      [message]="'Delete ' + (deleteTarget()?.po_no || '') + '? This cannot be undone.'"
      confirmLabel="Delete"
      variant="danger"
      (confirmed)="doDelete()"
      (cancelled)="showDeleteConfirm.set(false)"
    />
  `,
})
export class PurchaseOrdersComponent implements OnInit {
  poStore = inject(PurchaseOrderStore);
  catalogStore = inject(CatalogStore);

  filterStatus = signal<string>('all');
  showForm = signal(false);
  showGrnModal = signal(false);
  showStatusModal = signal(false);
  showConvertConfirm = signal(false);
  showDeleteConfirm = signal(false);
  saving = signal(false);
  savingGrn = signal(false);
  formError = signal('');
  grnError = signal('');
  statusTarget = signal<IPurchaseOrder | null>(null);
  grnTargetPO = signal<IPurchaseOrder | null>(null);
  grnHistory = signal<IGoodsReceiptNote[]>([]);
  convertTarget = signal<IPurchaseOrder | null>(null);
  deleteTarget = signal<IPurchaseOrder | null>(null);

  statusTabs = [
    { labelKey: 'base.all', value: 'all' },
    { labelKey: 'po.draft', value: 'draft' },
    { labelKey: 'po.sent', value: 'sent' },
    { labelKey: 'po.partially_received', value: 'partially_received' },
    { labelKey: 'po.received', value: 'received' },
    { labelKey: 'po.cancelled', value: 'cancelled' },
  ];

  // Form fields
  editingUuid = '';
  formPartyUuid = '';
  formDate = '';
  formExpectedDelivery = '';
  formItems: FormItem[] = [];
  formDiscount = 0;
  formNotes = '';
  selectedProductUuid = '';

  // GRN fields
  grnFormItems: GrnFormItem[] = [];

  totalOpenValue = computed(() =>
    this.poStore.openOrders().reduce((s, po) => s + po.total_amount, 0),
  );

  filteredOrders = computed(() => {
    const status = this.filterStatus();
    const all = this.poStore.purchaseOrders()
      .sort((a, b) => b.po_date - a.po_date);
    if (status === 'all') return all;
    return all.filter((po) => po.status === status);
  });

  availableStatuses = computed(() => {
    const current = this.statusTarget()?.status;
    const transitions: Record<string, string[]> = {
      draft: ['sent', 'cancelled'],
      sent: ['cancelled'],
      partially_received: ['cancelled'],
    };
    return transitions[current || ''] || [];
  });

  get formGrandTotal(): number {
    const itemsTotal = this.formItems.reduce((s, i) => s + i.total, 0);
    return Math.max(0, itemsTotal - this.formDiscount);
  }

  ngOnInit(): void {
    if (!this.poStore.initialized()) this.poStore.loadAll();
    if (!this.catalogStore.initialized()) this.catalogStore.loadAll();
  }

  countByStatus(status: string): number {
    if (status === 'all') return this.poStore.purchaseOrders().length;
    return this.poStore.purchaseOrders().filter((po) => po.status === status).length;
  }

  getPartyName(uuid: string | null): string {
    if (!uuid) return '-';
    return this.catalogStore.allParties().find((p) => p.uuid === uuid)?.name || '-';
  }

  // ─── PO Form ───────────────────────────────

  openForm(): void {
    this.editingUuid = '';
    this.formPartyUuid = '';
    this.formDate = new Date().toISOString().split('T')[0];
    this.formExpectedDelivery = '';
    this.formItems = [];
    this.formDiscount = 0;
    this.formNotes = '';
    this.formError.set('');
    this.showForm.set(true);
  }

  async editPO(po: IPurchaseOrder): Promise<void> {
    this.editingUuid = po.uuid;
    this.formPartyUuid = po.party_uuid || '';
    this.formDate = new Date(po.po_date).toISOString().split('T')[0];
    this.formExpectedDelivery = po.expected_delivery_date
      ? new Date(po.expected_delivery_date).toISOString().split('T')[0]
      : '';
    this.formDiscount = po.discount;
    this.formNotes = po.notes || '';
    this.formError.set('');

    const items = await this.poStore.getPurchaseOrderItems(po.uuid);
    this.formItems = items.map((item) => {
      const product = this.catalogStore.products().find((p) => p.uuid === item.item_uuid);
      return {
        item_uuid: item.item_uuid || '',
        name: product?.name || 'Unknown',
        quantity: item.quantity,
        price: item.price,
        discount: item.discount,
        total: item.total,
      };
    });

    this.showForm.set(true);
  }

  closeForm(): void {
    this.showForm.set(false);
  }

  addItem(): void {
    if (!this.selectedProductUuid) return;
    const product = this.catalogStore.products().find((p) => p.uuid === this.selectedProductUuid);
    if (!product) return;

    const existing = this.formItems.find((i) => i.item_uuid === product.uuid);
    if (existing) {
      existing.quantity++;
      existing.total = existing.quantity * existing.price - existing.discount;
    } else {
      this.formItems.push({
        item_uuid: product.uuid,
        name: product.name || '',
        quantity: 1,
        price: product.purchase_price,
        discount: 0,
        total: product.purchase_price,
      });
    }
    this.selectedProductUuid = '';
  }

  removeItem(index: number): void {
    this.formItems.splice(index, 1);
  }

  recalcItem(index: number): void {
    const item = this.formItems[index];
    item.total = Math.max(0, item.quantity * item.price - item.discount);
  }

  async savePO(): Promise<void> {
    if (!this.formPartyUuid) {
      this.formError.set('Supplier is required');
      return;
    }
    if (this.formItems.length === 0) {
      this.formError.set('Add at least one item');
      return;
    }

    this.saving.set(true);
    this.formError.set('');

    const data: Partial<IPurchaseOrder> = {
      party_uuid: this.formPartyUuid || null,
      po_date: new Date(this.formDate).getTime(),
      expected_delivery_date: this.formExpectedDelivery
        ? new Date(this.formExpectedDelivery).getTime()
        : 0,
      discount: this.formDiscount,
      total_amount: this.formGrandTotal,
      notes: this.formNotes || null,
      status: 'draft',
    };

    const items: Partial<IPurchaseOrderItem>[] = this.formItems.map((i) => ({
      item_uuid: i.item_uuid,
      quantity: i.quantity,
      price: i.price,
      discount: i.discount,
      total: i.total,
    }));

    if (this.editingUuid) {
      await this.poStore.deletePurchaseOrder(this.editingUuid);
      await this.poStore.addPurchaseOrder(data, items);
    } else {
      await this.poStore.addPurchaseOrder(data, items);
    }

    this.saving.set(false);
    this.closeForm();
  }

  // ─── GRN ───────────────────────────────────

  async openGrnModal(po: IPurchaseOrder): Promise<void> {
    this.grnTargetPO.set(po);
    this.grnError.set('');

    const items = await this.poStore.getPurchaseOrderItems(po.uuid);
    this.grnFormItems = items.map((item) => {
      const product = this.catalogStore.products().find((p) => p.uuid === item.item_uuid);
      const remaining = item.quantity - item.received_quantity;
      return {
        po_item_uuid: item.uuid,
        item_uuid: item.item_uuid || '',
        name: product?.name || 'Unknown',
        ordered_quantity: item.quantity,
        already_received: item.received_quantity,
        remaining,
        receiving_now: remaining,
      };
    });

    const grns = await this.poStore.getGRNsForPO(po.uuid);
    this.grnHistory.set(grns.sort((a, b) => b.grn_date - a.grn_date));
    this.showGrnModal.set(true);
  }

  async saveGrn(): Promise<void> {
    const po = this.grnTargetPO();
    if (!po) return;

    const receivingItems = this.grnFormItems.filter((i) => i.receiving_now > 0);
    if (receivingItems.length === 0) {
      this.grnError.set('Enter quantity for at least one item');
      return;
    }

    const overReceived = this.grnFormItems.find((i) => i.receiving_now > i.remaining);
    if (overReceived) {
      this.grnError.set(`Cannot receive more than remaining quantity for ${overReceived.name}`);
      return;
    }

    this.savingGrn.set(true);
    this.grnError.set('');

    await this.poStore.receiveGoods(
      po.uuid,
      receivingItems.map((i) => ({
        po_item_uuid: i.po_item_uuid,
        item_uuid: i.item_uuid,
        ordered_quantity: i.ordered_quantity,
        received_quantity: i.receiving_now,
      })),
    );

    this.savingGrn.set(false);
    this.showGrnModal.set(false);
  }

  // ─── Status ────────────────────────────────

  openStatusModal(po: IPurchaseOrder): void {
    this.statusTarget.set(po);
    this.showStatusModal.set(true);
  }

  async applyStatus(newStatus: string): Promise<void> {
    const po = this.statusTarget();
    if (!po) return;
    await this.poStore.updatePurchaseOrder(po.uuid, { status: newStatus as IPurchaseOrder['status'] });
    this.showStatusModal.set(false);
  }

  // ─── Convert ───────────────────────────────

  confirmConvert(po: IPurchaseOrder): void {
    this.convertTarget.set(po);
    this.showConvertConfirm.set(true);
  }

  async doConvert(): Promise<void> {
    const po = this.convertTarget();
    if (!po) return;
    await this.poStore.convertToInvoice(po.uuid);
    this.showConvertConfirm.set(false);
  }

  // ─── Delete ────────────────────────────────

  confirmDeletePO(po: IPurchaseOrder): void {
    this.deleteTarget.set(po);
    this.showDeleteConfirm.set(true);
  }

  async doDelete(): Promise<void> {
    const po = this.deleteTarget();
    if (!po) return;
    await this.poStore.deletePurchaseOrder(po.uuid);
    this.showDeleteConfirm.set(false);
  }
}
