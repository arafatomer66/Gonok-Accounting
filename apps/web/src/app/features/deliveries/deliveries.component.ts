import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DecimalPipe, DatePipe, TitleCasePipe } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { DeliveryStore } from '../../core/stores/delivery.store';
import { CatalogStore } from '../../core/stores/catalog.store';
import { TransactionStore } from '../../core/stores/transaction.store';
import { ChallanPrintComponent } from '../../shared/components/challan-print/challan-print.component';
import { IDelivery, IDeliveryItem, ITransactionItem, ETables } from '@org/shared-types';
import { PouchDbService } from '../../core/services/pouchdb.service';
import { AuthStore } from '../../core/stores/auth.store';

interface FormItem {
  item_uuid: string;
  name: string;
  ordered_quantity: number;
  delivered_quantity: number;
}

@Component({
  selector: 'gonok-deliveries',
  standalone: true,
  imports: [FormsModule, DecimalPipe, DatePipe, TitleCasePipe, TranslateModule, ChallanPrintComponent],
  styleUrl: './deliveries.component.scss',
  template: `
    <div class="page-header">
      <h1 class="page-header__title">{{ 'delivery.title' | translate }}</h1>
      <button class="btn btn--primary" (click)="openForm()">+ {{ 'delivery.new' | translate }}</button>
    </div>

    <!-- Status Tabs -->
    <div class="status-tabs">
      @for (tab of statusTabs; track tab.value) {
        <button
          class="status-tab"
          [class.status-tab--active]="filterStatus() === tab.value"
          (click)="filterStatus.set(tab.value)"
        >
          {{ tab.label }} ({{ countByStatus(tab.value) }})
        </button>
      }
    </div>

    <!-- Summary Cards -->
    <div class="summary-cards">
      <div class="summary-card">
        <div class="summary-card__label">{{ 'delivery.pending' | translate }}</div>
        <div class="summary-card__value summary-card__value--warning">{{ deliveryStore.pending().length }}</div>
      </div>
      <div class="summary-card">
        <div class="summary-card__label">{{ 'delivery.in_transit' | translate }}</div>
        <div class="summary-card__value summary-card__value--info">{{ deliveryStore.inTransit().length + deliveryStore.dispatched().length }}</div>
      </div>
      <div class="summary-card">
        <div class="summary-card__label">{{ 'delivery.delivered_count' | translate }}</div>
        <div class="summary-card__value summary-card__value--success">{{ deliveryStore.delivered().length }}</div>
      </div>
    </div>

    <!-- List -->
    <div class="card">
      <div class="table-wrapper">
        <table class="table">
          <thead>
            <tr>
              <th>{{ 'delivery.challan_no' | translate }}</th>
              <th>{{ 'base.date' | translate }}</th>
              <th>{{ 'delivery.party' | translate }}</th>
              <th>{{ 'delivery.driver' | translate }}</th>
              <th class="text-center">{{ 'delivery.items_count' | translate }}</th>
              <th>{{ 'delivery.status_label' | translate }}</th>
              <th>{{ 'base.action' | translate }}</th>
            </tr>
          </thead>
          <tbody>
            @for (d of filteredDeliveries(); track d.uuid) {
              <tr>
                <td class="font-medium">{{ d.delivery_no }}</td>
                <td>{{ d.delivery_date | date:'dd/MM/yyyy' }}</td>
                <td>{{ getPartyName(d.party_uuid) }}</td>
                <td>{{ d.driver_name || '-' }}</td>
                <td class="text-center">{{ d.total_items }} ({{ d.total_quantity }})</td>
                <td>
                  <span class="badge" [class]="'badge--' + d.status">{{ d.status | titlecase }}</span>
                </td>
                <td>
                  <div class="action-btns">
                    @if (d.status !== 'delivered') {
                      <button class="btn btn--sm btn--primary" (click)="advanceStatus(d)">
                        {{ nextStatusLabel(d.status) }}
                      </button>
                    }
                    <button class="btn btn--sm btn--ghost" (click)="printChallan(d)" title="Print">🖨️</button>
                    @if (d.status === 'pending') {
                      <button class="btn btn--sm btn--ghost" (click)="editDelivery(d)">{{ 'base.edit' | translate }}</button>
                    }
                    <button class="btn btn--sm btn--ghost text-danger" (click)="confirmDelete(d)">&times;</button>
                  </div>
                </td>
              </tr>
            } @empty {
              <tr><td colspan="7" class="text-center text-muted">{{ 'delivery.empty' | translate }}</td></tr>
            }
          </tbody>
        </table>
      </div>
    </div>

    <!-- Print -->
    @if (printingDelivery()) {
      <gonok-challan-print
        [delivery]="printingDelivery()!"
        [visible]="true"
        (closed)="printingDelivery.set(null)"
      />
    }

    <!-- Form Modal -->
    @if (showForm()) {
      <div class="modal-backdrop" (click)="closeForm()">
        <div class="modal modal--wide" (click)="$event.stopPropagation()">
          <div class="modal__header">
            <h3>{{ editingUuid ? ('delivery.edit' | translate) : ('delivery.new' | translate) }}</h3>
            <button class="modal__close" (click)="closeForm()">&times;</button>
          </div>

          <div class="modal__body">
            <!-- Link to Sale -->
            <div class="form-group">
              <label class="form-label">{{ 'delivery.from_sale' | translate }}</label>
              <select class="form-input" [(ngModel)]="formTxUuid" name="txLink" (change)="onSaleSelected()">
                <option value="">{{ 'delivery.standalone' | translate }}</option>
                @for (tx of recentSales(); track tx.uuid) {
                  <option [value]="tx.uuid">{{ tx.invoice_no || tx.order_number }} — {{ getPartyName(tx.party_uuid) }} (&#2547;{{ tx.total_amount | number:'1.0-0' }})</option>
                }
              </select>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">{{ 'delivery.party' | translate }} *</label>
                <select class="form-input" [(ngModel)]="formPartyUuid" name="party" (change)="onPartyChange()">
                  <option value="">{{ 'base.select' | translate }}</option>
                  @for (p of catalogStore.parties(); track p.uuid) {
                    <option [value]="p.uuid">{{ p.name }}</option>
                  }
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">{{ 'base.date' | translate }}</label>
                <input class="form-input" type="date" [(ngModel)]="formDate" name="date" />
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">{{ 'delivery.address' | translate }}</label>
              <input class="form-input" type="text" [(ngModel)]="formAddress" name="address" placeholder="Delivery address..." />
            </div>

            <!-- Driver Info -->
            <h4 class="section-heading">{{ 'delivery.driver_info' | translate }}</h4>
            <div class="form-row form-row--3">
              <div class="form-group">
                <label class="form-label">{{ 'delivery.driver_name' | translate }}</label>
                <input class="form-input" type="text" [(ngModel)]="formDriverName" name="driverName" />
              </div>
              <div class="form-group">
                <label class="form-label">{{ 'delivery.driver_phone' | translate }}</label>
                <input class="form-input" type="tel" [(ngModel)]="formDriverPhone" name="driverPhone" />
              </div>
              <div class="form-group">
                <label class="form-label">{{ 'delivery.vehicle_no' | translate }}</label>
                <input class="form-input" type="text" [(ngModel)]="formVehicleNo" name="vehicleNo" />
              </div>
            </div>

            <!-- Items -->
            <h4 class="section-heading">{{ 'delivery.items_heading' | translate }}</h4>
            @if (!formTxUuid) {
              <div class="item-add-row">
                <select class="form-input" [(ngModel)]="selectedProductUuid" name="productAdd">
                  <option value="">Select product...</option>
                  @for (p of catalogStore.products(); track p.uuid) {
                    <option [value]="p.uuid">{{ p.name }}</option>
                  }
                </select>
                <button class="btn btn--primary btn--sm" (click)="addManualItem()" [disabled]="!selectedProductUuid">+ Add</button>
              </div>
            }

            @if (formItems.length > 0) {
              <div class="table-wrapper">
                <table class="table table--sm">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th class="text-center">Ordered Qty</th>
                      <th class="text-center">Deliver Qty</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (item of formItems; track $index; let i = $index) {
                      <tr>
                        <td class="font-medium">{{ item.name }}</td>
                        <td class="text-center">{{ item.ordered_quantity }}</td>
                        <td>
                          <input class="inline-input text-center" type="number" [(ngModel)]="item.delivered_quantity" [name]="'delQty'+i" min="0" [max]="item.ordered_quantity" />
                        </td>
                        <td>
                          @if (!formTxUuid) {
                            <button class="btn btn--sm btn--ghost text-danger" (click)="formItems.splice(i, 1)">&times;</button>
                          }
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            } @else {
              <p class="text-muted">{{ formTxUuid ? 'Loading items...' : 'Add items to deliver' }}</p>
            }

            <div class="form-group">
              <label class="form-label">{{ 'delivery.notes' | translate }}</label>
              <input class="form-input" type="text" [(ngModel)]="formNotes" name="notes" />
            </div>

            @if (formError()) {
              <p class="form-error">{{ formError() }}</p>
            }
          </div>

          <div class="modal__footer">
            <button class="btn btn--ghost" (click)="closeForm()">{{ 'base.cancel' | translate }}</button>
            <button class="btn btn--primary" (click)="saveDelivery()" [disabled]="saving()">
              {{ saving() ? 'Saving...' : ('base.save' | translate) }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class DeliveriesComponent implements OnInit {
  deliveryStore = inject(DeliveryStore);
  catalogStore = inject(CatalogStore);
  private transactionStore = inject(TransactionStore);
  private pouchDb = inject(PouchDbService);
  private authStore = inject(AuthStore);

  filterStatus = signal<string>('all');
  showForm = signal(false);
  saving = signal(false);
  formError = signal('');
  printingDelivery = signal<IDelivery | null>(null);

  statusTabs = [
    { label: 'All', value: 'all' },
    { label: 'Pending', value: 'pending' },
    { label: 'Dispatched', value: 'dispatched' },
    { label: 'In Transit', value: 'in_transit' },
    { label: 'Delivered', value: 'delivered' },
  ];

  // Form fields
  editingUuid = '';
  formTxUuid = '';
  formPartyUuid = '';
  formDate = '';
  formAddress = '';
  formDriverName = '';
  formDriverPhone = '';
  formVehicleNo = '';
  formNotes = '';
  formItems: FormItem[] = [];
  selectedProductUuid = '';

  filteredDeliveries = computed(() => {
    const status = this.filterStatus();
    const all = this.deliveryStore.deliveries()
      .sort((a, b) => b.delivery_date - a.delivery_date);
    if (status === 'all') return all;
    return all.filter((d) => d.status === status);
  });

  recentSales = computed(() =>
    this.transactionStore.sales()
      .sort((a, b) => b.transaction_date - a.transaction_date)
      .slice(0, 50),
  );

  ngOnInit(): void {
    if (!this.deliveryStore.initialized()) this.deliveryStore.loadAll();
    if (!this.catalogStore.initialized()) this.catalogStore.loadAll();
    if (!this.transactionStore.initialized()) this.transactionStore.loadAll();
  }

  countByStatus(status: string): number {
    if (status === 'all') return this.deliveryStore.deliveries().length;
    return this.deliveryStore.deliveries().filter((d) => d.status === status).length;
  }

  getPartyName(uuid: string | null): string {
    if (!uuid) return '-';
    return this.catalogStore.allParties().find((p) => p.uuid === uuid)?.name || '-';
  }

  nextStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      pending: '→ Dispatch',
      dispatched: '→ In Transit',
      in_transit: '→ Delivered',
    };
    return labels[status] || '';
  }

  async advanceStatus(d: IDelivery): Promise<void> {
    const nextMap: Record<string, string> = {
      pending: 'dispatched',
      dispatched: 'in_transit',
      in_transit: 'delivered',
    };
    const next = nextMap[d.status];
    if (next) {
      await this.deliveryStore.updateDelivery(d.uuid, { status: next as IDelivery['status'] });
    }
  }

  printChallan(d: IDelivery): void {
    this.printingDelivery.set(d);
  }

  openForm(txUuid?: string): void {
    this.editingUuid = '';
    this.formTxUuid = txUuid || '';
    this.formPartyUuid = '';
    this.formDate = new Date().toISOString().split('T')[0];
    this.formAddress = '';
    this.formDriverName = '';
    this.formDriverPhone = '';
    this.formVehicleNo = '';
    this.formNotes = '';
    this.formItems = [];
    this.formError.set('');
    this.showForm.set(true);

    if (txUuid) {
      this.onSaleSelected();
    }
  }

  async editDelivery(d: IDelivery): Promise<void> {
    this.editingUuid = d.uuid;
    this.formTxUuid = d.transaction_uuid || '';
    this.formPartyUuid = d.party_uuid || '';
    this.formDate = new Date(d.delivery_date).toISOString().split('T')[0];
    this.formAddress = d.delivery_address || '';
    this.formDriverName = d.driver_name || '';
    this.formDriverPhone = d.driver_phone || '';
    this.formVehicleNo = d.vehicle_no || '';
    this.formNotes = d.notes || '';
    this.formError.set('');

    const items = await this.deliveryStore.getDeliveryItems(d.uuid);
    this.formItems = items.map((item) => ({
      item_uuid: item.item_uuid || '',
      name: this.catalogStore.products().find((p) => p.uuid === item.item_uuid)?.name || 'Unknown',
      ordered_quantity: item.ordered_quantity,
      delivered_quantity: item.delivered_quantity,
    }));

    this.showForm.set(true);
  }

  closeForm(): void {
    this.showForm.set(false);
  }

  async onSaleSelected(): Promise<void> {
    if (!this.formTxUuid) {
      this.formItems = [];
      return;
    }

    const tx = this.transactionStore.transactions().find((t) => t.uuid === this.formTxUuid);
    if (!tx) return;

    this.formPartyUuid = tx.party_uuid || '';
    this.onPartyChange();

    // Load transaction items
    const bizUuid = this.authStore.activeBusinessUuid();
    if (!bizUuid) return;
    const allItems = await this.pouchDb.findByBusiness<ITransactionItem>(ETables.TRANSACTION_ITEM, bizUuid);
    const txItems = allItems.filter((i) => i.transaction_uuid === tx.uuid);

    this.formItems = txItems.map((item) => ({
      item_uuid: item.item_uuid || '',
      name: this.catalogStore.products().find((p) => p.uuid === item.item_uuid)?.name || 'Unknown',
      ordered_quantity: item.quantity,
      delivered_quantity: item.quantity,
    }));
  }

  onPartyChange(): void {
    const party = this.catalogStore.parties().find((p) => p.uuid === this.formPartyUuid);
    if (party) {
      this.formAddress = (party as unknown as Record<string, unknown>)['shipping_address'] as string
        || (party as unknown as Record<string, unknown>)['address'] as string
        || '';
    }
  }

  addManualItem(): void {
    if (!this.selectedProductUuid) return;
    const product = this.catalogStore.products().find((p) => p.uuid === this.selectedProductUuid);
    if (!product) return;

    const existing = this.formItems.find((i) => i.item_uuid === product.uuid);
    if (existing) {
      existing.ordered_quantity++;
      existing.delivered_quantity++;
    } else {
      this.formItems.push({
        item_uuid: product.uuid,
        name: product.name || '',
        ordered_quantity: 1,
        delivered_quantity: 1,
      });
    }
    this.selectedProductUuid = '';
  }

  async saveDelivery(): Promise<void> {
    if (this.formItems.length === 0) {
      this.formError.set('Add at least one item');
      return;
    }
    if (!this.formPartyUuid) {
      this.formError.set('Please select a party');
      return;
    }

    this.saving.set(true);

    const data: Partial<IDelivery> = {
      transaction_uuid: this.formTxUuid || null,
      party_uuid: this.formPartyUuid,
      delivery_date: new Date(this.formDate).getTime(),
      delivery_address: this.formAddress.trim() || null,
      driver_name: this.formDriverName.trim() || null,
      driver_phone: this.formDriverPhone.trim() || null,
      vehicle_no: this.formVehicleNo.trim() || null,
      notes: this.formNotes.trim() || null,
      status: 'pending',
    };

    const items: Partial<IDeliveryItem>[] = this.formItems
      .filter((i) => i.delivered_quantity > 0)
      .map((i) => ({
        item_uuid: i.item_uuid,
        ordered_quantity: i.ordered_quantity,
        delivered_quantity: i.delivered_quantity,
      }));

    if (this.editingUuid) {
      await this.deliveryStore.deleteDelivery(this.editingUuid);
    }
    await this.deliveryStore.addDelivery(data, items);

    this.saving.set(false);
    this.closeForm();
  }

  async confirmDelete(d: IDelivery): Promise<void> {
    if (confirm(`Delete challan "${d.delivery_no}"?`)) {
      await this.deliveryStore.deleteDelivery(d.uuid);
    }
  }
}
