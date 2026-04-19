import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DecimalPipe, DatePipe } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { QuotationStore } from '../../core/stores/quotation.store';
import { CatalogStore } from '../../core/stores/catalog.store';
import { TransactionStore } from '../../core/stores/transaction.store';
import { IQuotation, IQuotationItem, ETransactionType, ETransactionMode } from '@org/shared-types';

interface FormItem {
  item_uuid: string;
  name: string;
  quantity: number;
  price: number;
  discount: number;
  total: number;
}

@Component({
  selector: 'gonok-quotations',
  standalone: true,
  imports: [FormsModule, DecimalPipe, DatePipe, TranslateModule],
  styleUrl: './quotations.component.scss',
  template: `
    <div class="page-header">
      <h1 class="page-header__title">{{ 'quotation.title' | translate }}</h1>
      <button class="btn btn--primary" (click)="openForm()">+ {{ 'quotation.new' | translate }}</button>
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

    <!-- List -->
    <div class="card">
      <div class="table-wrapper">
        <table class="table">
          <thead>
            <tr>
              <th>{{ 'quotation.quotation_no' | translate }}</th>
              <th>{{ 'base.date' | translate }}</th>
              <th>{{ 'quotation.party' | translate }}</th>
              <th>{{ 'quotation.valid_until' | translate }}</th>
              <th class="text-right">{{ 'transaction.total_amount' | translate }}</th>
              <th>{{ 'quotation.status' | translate }}</th>
              <th>{{ 'base.action' | translate }}</th>
            </tr>
          </thead>
          <tbody>
            @for (q of filteredQuotations(); track q.uuid) {
              <tr>
                <td class="font-medium">{{ q.quotation_no }}</td>
                <td>{{ q.quotation_date | date:'dd/MM/yyyy' }}</td>
                <td>{{ getPartyName(q.party_uuid) }}</td>
                <td>{{ q.valid_until | date:'dd/MM/yyyy' }}</td>
                <td class="text-right font-medium">&#2547;{{ q.total_amount | number:'1.2-2' }}</td>
                <td>
                  <span class="badge" [class]="'badge--' + q.status">{{ q.status }}</span>
                </td>
                <td>
                  <div class="action-btns">
                    @if (q.status === 'draft' || q.status === 'sent') {
                      <button class="btn btn--sm btn--ghost" (click)="editQuotation(q)">{{ 'base.edit' | translate }}</button>
                    }
                    @if (q.status === 'accepted' || q.status === 'sent') {
                      <button class="btn btn--sm btn--primary" (click)="convertToSale(q)">{{ 'quotation.convert' | translate }}</button>
                    }
                    @if (q.status !== 'converted') {
                      <button class="btn btn--sm btn--ghost" (click)="updateStatus(q)">{{ 'quotation.change_status' | translate }}</button>
                    }
                    <button class="btn btn--sm btn--ghost text-danger" (click)="confirmDelete(q)">{{ 'base.yes_delete' | translate }}</button>
                  </div>
                </td>
              </tr>
            } @empty {
              <tr><td colspan="7" class="text-center text-muted">No quotations found</td></tr>
            }
          </tbody>
        </table>
      </div>
    </div>

    <!-- Form Modal -->
    @if (showForm()) {
      <div class="modal-backdrop" (click)="closeForm()">
        <div class="modal modal--wide" (click)="$event.stopPropagation()">
          <div class="modal__header">
            <h3>{{ editingUuid ? ('quotation.edit' | translate) : ('quotation.new' | translate) }}</h3>
            <button class="modal__close" (click)="closeForm()">&times;</button>
          </div>

          <div class="modal__body">
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">{{ 'quotation.party' | translate }}</label>
                <select class="form-input" [(ngModel)]="formPartyUuid" name="party">
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
              <div class="form-group">
                <label class="form-label">{{ 'quotation.valid_until' | translate }}</label>
                <input class="form-input" type="date" [(ngModel)]="formValidUntil" name="validUntil" />
              </div>
            </div>

            <!-- Items -->
            <h4 class="items-heading">Items</h4>
            <div class="item-add-row">
              <select class="form-input" [(ngModel)]="selectedProductUuid" name="productSelect">
                <option value="">Select product...</option>
                @for (p of catalogStore.products(); track p.uuid) {
                  <option [value]="p.uuid">{{ p.name }} (&#2547;{{ p.sales_price }})</option>
                }
              </select>
              <button class="btn btn--primary btn--sm" (click)="addItem()" [disabled]="!selectedProductUuid">+ Add</button>
            </div>

            @if (formItems.length > 0) {
              <div class="table-wrapper">
                <table class="table table--sm">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th class="text-right">Price</th>
                      <th class="text-right">Qty</th>
                      <th class="text-right">Discount</th>
                      <th class="text-right">Total</th>
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
                <label class="form-label">{{ 'quotation.notes' | translate }}</label>
                <input class="form-input" type="text" [(ngModel)]="formNotes" name="notes" />
              </div>
            </div>

            <div class="form-total">
              Total: &#2547;{{ formGrandTotal | number:'1.2-2' }}
            </div>

            @if (formError()) {
              <p class="form-error">{{ formError() }}</p>
            }
          </div>

          <div class="modal__footer">
            <button class="btn btn--ghost" (click)="closeForm()">{{ 'base.cancel' | translate }}</button>
            <button class="btn btn--primary" (click)="saveQuotation()" [disabled]="saving()">
              {{ saving() ? 'Saving...' : ('base.save' | translate) }}
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
            <h3>{{ 'quotation.change_status' | translate }}</h3>
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
  `,
})
export class QuotationsComponent implements OnInit {
  quotationStore = inject(QuotationStore);
  catalogStore = inject(CatalogStore);
  private transactionStore = inject(TransactionStore);

  filterStatus = signal<string>('all');
  showForm = signal(false);
  showStatusModal = signal(false);
  saving = signal(false);
  formError = signal('');
  statusTarget = signal<IQuotation | null>(null);

  statusTabs = [
    { label: 'All', value: 'all' },
    { label: 'Draft', value: 'draft' },
    { label: 'Sent', value: 'sent' },
    { label: 'Accepted', value: 'accepted' },
    { label: 'Converted', value: 'converted' },
    { label: 'Rejected', value: 'rejected' },
  ];

  // Form fields
  editingUuid = '';
  formPartyUuid = '';
  formDate = '';
  formValidUntil = '';
  formItems: FormItem[] = [];
  formDiscount = 0;
  formNotes = '';
  selectedProductUuid = '';

  filteredQuotations = computed(() => {
    const status = this.filterStatus();
    const all = this.quotationStore.quotations()
      .sort((a, b) => b.quotation_date - a.quotation_date);
    if (status === 'all') return all;
    return all.filter((q) => q.status === status);
  });

  availableStatuses = computed(() => {
    const current = this.statusTarget()?.status;
    const transitions: Record<string, string[]> = {
      draft: ['sent'],
      sent: ['accepted', 'rejected'],
      accepted: ['rejected'],
      rejected: ['draft'],
    };
    return transitions[current || ''] || [];
  });

  get formGrandTotal(): number {
    const itemsTotal = this.formItems.reduce((s, i) => s + i.total, 0);
    return Math.max(0, itemsTotal - this.formDiscount);
  }

  ngOnInit(): void {
    if (!this.quotationStore.initialized()) this.quotationStore.loadAll();
    if (!this.catalogStore.initialized()) this.catalogStore.loadAll();
  }

  countByStatus(status: string): number {
    if (status === 'all') return this.quotationStore.quotations().length;
    return this.quotationStore.quotations().filter((q) => q.status === status).length;
  }

  getPartyName(uuid: string | null): string {
    if (!uuid) return '-';
    return this.catalogStore.allParties().find((p) => p.uuid === uuid)?.name || '-';
  }

  openForm(): void {
    this.editingUuid = '';
    this.formPartyUuid = '';
    const today = new Date();
    this.formDate = today.toISOString().split('T')[0];
    const validDate = new Date(today);
    validDate.setDate(validDate.getDate() + 30);
    this.formValidUntil = validDate.toISOString().split('T')[0];
    this.formItems = [];
    this.formDiscount = 0;
    this.formNotes = '';
    this.formError.set('');
    this.showForm.set(true);
  }

  async editQuotation(q: IQuotation): Promise<void> {
    this.editingUuid = q.uuid;
    this.formPartyUuid = q.party_uuid || '';
    this.formDate = new Date(q.quotation_date).toISOString().split('T')[0];
    this.formValidUntil = new Date(q.valid_until).toISOString().split('T')[0];
    this.formDiscount = q.discount;
    this.formNotes = q.notes || '';
    this.formError.set('');

    const items = await this.quotationStore.getQuotationItems(q.uuid);
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
        price: product.sales_price,
        discount: 0,
        total: product.sales_price,
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

  async saveQuotation(): Promise<void> {
    if (this.formItems.length === 0) {
      this.formError.set('Add at least one item');
      return;
    }

    this.saving.set(true);
    this.formError.set('');

    const data: Partial<IQuotation> = {
      party_uuid: this.formPartyUuid || null,
      quotation_date: new Date(this.formDate).getTime(),
      valid_until: new Date(this.formValidUntil).getTime(),
      discount: this.formDiscount,
      total_amount: this.formGrandTotal,
      notes: this.formNotes || null,
      status: 'draft',
    };

    const items: Partial<IQuotationItem>[] = this.formItems.map((i) => ({
      item_uuid: i.item_uuid,
      quantity: i.quantity,
      price: i.price,
      discount: i.discount,
      total: i.total,
    }));

    if (this.editingUuid) {
      await this.quotationStore.deleteQuotation(this.editingUuid);
      await this.quotationStore.addQuotation(data, items);
    } else {
      await this.quotationStore.addQuotation(data, items);
    }

    this.saving.set(false);
    this.closeForm();
  }

  updateStatus(q: IQuotation): void {
    this.statusTarget.set(q);
    this.showStatusModal.set(true);
  }

  async applyStatus(newStatus: string): Promise<void> {
    const q = this.statusTarget();
    if (!q) return;
    await this.quotationStore.updateQuotation(q.uuid, { status: newStatus as IQuotation['status'] });
    this.showStatusModal.set(false);
  }

  async convertToSale(q: IQuotation): Promise<void> {
    const items = await this.quotationStore.getQuotationItems(q.uuid);

    await this.transactionStore.addTransaction(
      {
        type: ETransactionType.SALES,
        party_uuid: q.party_uuid,
        transaction_date: Date.now(),
        transaction_mode: ETransactionMode.CASH,
        discount: q.discount,
        total_amount: q.total_amount,
        paid_amount: q.total_amount,
        due_amount: 0,
        description: `Converted from Quotation ${q.quotation_no}`,
      },
      items.map((item) => ({
        item_uuid: item.item_uuid,
        quantity: item.quantity,
        sales_price: item.price,
        purchase_price: 0,
      })),
    );

    await this.quotationStore.updateQuotation(q.uuid, {
      status: 'converted',
    });
  }

  async confirmDelete(q: IQuotation): Promise<void> {
    if (confirm('Are you sure you want to delete this quotation?')) {
      await this.quotationStore.deleteQuotation(q.uuid);
    }
  }
}
