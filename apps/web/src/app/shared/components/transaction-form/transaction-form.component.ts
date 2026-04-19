import { Component, inject, input, output, signal, computed, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { CatalogStore } from '../../../core/stores/catalog.store';
import { TransactionStore } from '../../../core/stores/transaction.store';
import { PouchDbService } from '../../../core/services/pouchdb.service';
import { AuthStore } from '../../../core/stores/auth.store';
import {
  ITransaction,
  ITransactionItem,
  ETables,
  ETransactionType,
  ETransactionMode,
  EPaymentType,
} from '@org/shared-types';

interface IBankAccount {
  uuid: string;
  bank_name: string;
  account_name: string;
  account_number: string;
}

interface ItemLine {
  item_uuid: string;
  product_name: string;
  quantity: number;
  price: number;
  item_wise_tax: number;
  total_tax: number;
  net_amount: number;
}

@Component({
  selector: 'gonok-transaction-form',
  standalone: true,
  imports: [FormsModule, DecimalPipe],
  template: `
    <div class="modal-backdrop" (click)="cancelled.emit()">
      <div class="modal modal--wide" (click)="$event.stopPropagation()">
        <div class="modal__header">
          <h3 class="modal__title">{{ title() }}</h3>
          <button class="modal__close" (click)="cancelled.emit()">&times;</button>
        </div>
        <div class="modal__body">
          <!-- Mode Toggle -->
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Mode</label>
              <select class="form-input" [(ngModel)]="transactionMode" name="mode" (ngModelChange)="recalculate()">
                <option value="Cash">Cash</option>
                <option value="Credit">Credit</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">{{ partyLabel() }} *</label>
              <select class="form-input" [(ngModel)]="partyUuid" name="partyUuid">
                @for (party of availableParties(); track party.uuid) {
                  <option [value]="party.uuid">{{ party.name }}</option>
                }
              </select>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Date</label>
              <input class="form-input" type="date" [(ngModel)]="txDate" name="txDate" />
            </div>
            <div class="form-group">
              <label class="form-label">{{ isPayment() ? 'Receipt No' : 'Invoice No' }}</label>
              <input class="form-input" type="text" [(ngModel)]="invoiceNo" name="invoiceNo" />
            </div>
          </div>

          <!-- Item Lines (not for payments) -->
          @if (!isPayment()) {
            <div class="item-lines">
              <h4 class="section-title">Items</h4>
              <div class="table-wrapper">
                <table class="table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Product</th>
                      <th class="text-right">Qty</th>
                      <th class="text-right">Price</th>
                      <th class="text-right">Tax %</th>
                      <th class="text-right">Amount</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (line of itemLines(); track $index; let i = $index) {
                      <tr>
                        <td>{{ i + 1 }}</td>
                        <td>{{ line.product_name }}</td>
                        <td class="col-amount">{{ line.quantity }}</td>
                        <td class="col-amount">{{ line.price | number:'1.2-2' }}</td>
                        <td class="col-amount">{{ line.item_wise_tax }}</td>
                        <td class="col-amount">{{ line.net_amount | number:'1.2-2' }}</td>
                        <td>
                          <button class="btn btn--sm btn--ghost btn--danger-text" (click)="removeLine(i)">&times;</button>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>

              <!-- Add item row -->
              <div class="add-item-row">
                <select class="form-input" [(ngModel)]="newItemUuid" name="newItem">
                  <option value="">-- Select Product --</option>
                  @for (p of catalogStore.products(); track p.uuid) {
                    <option [value]="p.uuid">{{ p.name }} (Stock: {{ p.quantity }})</option>
                  }
                </select>
                <input class="form-input form-input--sm" type="number" [(ngModel)]="newQty" name="newQty" placeholder="Qty" min="1" step="1" />
                <input class="form-input form-input--sm" type="number" [(ngModel)]="newPrice" name="newPrice" placeholder="Price" min="0" step="0.01" />
                <button class="btn btn--sm btn--primary" type="button" (click)="addLine()">Add</button>
              </div>
            </div>
          }

          <!-- Payment Type -->
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Payment Type</label>
              <select class="form-input" [(ngModel)]="paymentType" name="paymentType">
                <optgroup label="Cash">
                  <option value="Cash">Cash</option>
                </optgroup>
                <optgroup label="Cheque">
                  <option value="Cheque">Cheque</option>
                </optgroup>
                <optgroup label="Mobile Banking">
                  <option value="bKash">bKash</option>
                  <option value="Nagad">Nagad</option>
                  <option value="Rocket">Rocket</option>
                </optgroup>
                @if (bankAccounts().length > 0) {
                  <optgroup label="Bank">
                    @for (acc of bankAccounts(); track acc.uuid) {
                      <option [value]="'Bank:' + acc.uuid">{{ acc.bank_name }} ({{ acc.account_number }})</option>
                    }
                  </optgroup>
                }
              </select>
            </div>
            @if (paymentType === 'Cheque') {
              <div class="form-group">
                <label class="form-label">Cheque Ref No.</label>
                <input class="form-input" type="text" [(ngModel)]="chequeRefNo" name="chequeRefNo" />
              </div>
            }
            @if (paymentType === 'bKash' || paymentType === 'Nagad' || paymentType === 'Rocket' || paymentType.startsWith('Bank:')) {
              <div class="form-group">
                <label class="form-label">Transaction ID / Ref</label>
                <input class="form-input" type="text" [(ngModel)]="chequeRefNo" name="txRef" placeholder="Transaction ID" />
              </div>
            }
          </div>

          <!-- Totals -->
          <div class="totals-section">
            @if (!isPayment()) {
              <div class="total-row">
                <span>Subtotal</span>
                <span class="col-amount">&#2547;{{ subtotal() | number:'1.2-2' }}</span>
              </div>
              @if (totalTax() > 0) {
                <div class="total-row">
                  <span>Tax</span>
                  <span class="col-amount">&#2547;{{ totalTax() | number:'1.2-2' }}</span>
                </div>
              }
              <div class="total-row">
                <label class="form-label">Discount</label>
                <input class="form-input form-input--sm" type="number" [(ngModel)]="discount" name="discount" min="0" step="0.01" (ngModelChange)="recalculate()" />
              </div>
              <div class="total-row total-row--grand">
                <span>Total</span>
                <span class="col-amount">&#2547;{{ totalAmount() | number:'1.2-2' }}</span>
              </div>
            }

            <div class="total-row">
              <label class="form-label">{{ isPayment() ? 'Amount' : 'Paid' }}</label>
              <input class="form-input form-input--sm" type="number" [(ngModel)]="paidAmount" name="paidAmount" min="0" step="0.01" (ngModelChange)="recalculate()" />
            </div>
            @if (!isPayment()) {
              <div class="total-row total-row--due">
                <span>Due</span>
                <span class="col-amount">&#2547;{{ dueAmount() | number:'1.2-2' }}</span>
              </div>
            }
          </div>

          <div class="form-group">
            <label class="form-label">Notes</label>
            <textarea class="form-input" [(ngModel)]="description" name="description" rows="2" placeholder="Optional notes"></textarea>
          </div>

          @if (error()) {
            <p class="form-error">{{ error() }}</p>
          }
        </div>
        <div class="modal__footer">
          <button class="btn btn--ghost" type="button" (click)="cancelled.emit()">Cancel</button>
          <button class="btn btn--primary" (click)="save()" [disabled]="saving()">
            {{ saving() ? 'Saving...' : 'Save' }}
          </button>
        </div>
      </div>
    </div>
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
    .section-title {
      font-size: $font-size-base;
      font-weight: $font-weight-semibold;
      margin-bottom: $space-2;
    }
    .item-lines { margin-bottom: $space-4; }
    .add-item-row {
      display: flex;
      gap: $space-2;
      margin-top: $space-2;
      align-items: center;
      select { flex: 2; }
      .form-input--sm { width: 100px; }
    }
    .totals-section {
      background: $color-gray-50;
      border-radius: $radius-md;
      padding: $space-3 $space-4;
      margin-bottom: $space-4;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: $space-1 0;
      font-size: $font-size-sm;
      .form-input--sm { width: 120px; text-align: right; }
    }
    .total-row--grand {
      font-weight: $font-weight-semibold;
      font-size: $font-size-base;
      border-top: 1px solid $color-border;
      padding-top: $space-2;
    }
    .total-row--due {
      font-weight: $font-weight-semibold;
      color: $color-danger;
    }
    .btn--danger-text {
      color: $color-danger;
      font-size: 1.2rem;
      &:hover { background: rgba($color-danger, 0.08); }
    }
  `,
})
export class TransactionFormComponent implements OnInit {
  catalogStore = inject(CatalogStore);
  private transactionStore = inject(TransactionStore);
  private pouchDb = inject(PouchDbService);
  private authStore = inject(AuthStore);

  bankAccounts = signal<IBankAccount[]>([]);

  txType = input.required<ETransactionType>();
  transaction = input<ITransaction | null>(null);
  saved = output<void>();
  cancelled = output<void>();

  saving = signal(false);
  error = signal('');
  itemLines = signal<ItemLine[]>([]);

  // Form fields
  transactionMode = ETransactionMode.CASH;
  partyUuid = '';
  txDate = new Date().toISOString().split('T')[0];
  invoiceNo = '';
  discount = 0;
  paidAmount = 0;
  paymentType = EPaymentType.CASH;
  chequeRefNo = '';
  description = '';

  // Add-item fields
  newItemUuid = '';
  newQty = 1;
  newPrice = 0;

  title = computed(() => {
    const t = this.transaction();
    const prefix = t ? 'Edit' : 'New';
    const labels: Record<string, string> = {
      [ETransactionType.SALES]: 'Sale',
      [ETransactionType.PURCHASE]: 'Purchase',
      [ETransactionType.SALES_RETURN]: 'Sales Return',
      [ETransactionType.PURCHASE_RETURN]: 'Purchase Return',
      [ETransactionType.PAYMENT_IN]: 'Payment In',
      [ETransactionType.PAYMENT_OUT]: 'Payment Out',
    };
    return `${prefix} ${labels[this.txType()] || ''}`;
  });

  partyLabel = computed(() => {
    const t = this.txType();
    return t === ETransactionType.PURCHASE ||
      t === ETransactionType.PURCHASE_RETURN ||
      t === ETransactionType.PAYMENT_OUT
      ? 'Supplier'
      : 'Customer';
  });

  isPayment = computed(() =>
    this.txType() === ETransactionType.PAYMENT_IN ||
    this.txType() === ETransactionType.PAYMENT_OUT,
  );

  isSalesType = computed(() =>
    this.txType() === ETransactionType.SALES ||
    this.txType() === ETransactionType.SALES_RETURN,
  );

  availableParties = computed(() => {
    const t = this.txType();
    const isSupplierType =
      t === ETransactionType.PURCHASE ||
      t === ETransactionType.PURCHASE_RETURN ||
      t === ETransactionType.PAYMENT_OUT;
    return this.catalogStore.allParties().filter((p) =>
      isSupplierType
        ? p.party_type === 'supplier'
        : p.party_type === 'customer',
    );
  });

  subtotal = computed(() =>
    this.itemLines().reduce((sum, l) => sum + l.quantity * l.price, 0),
  );

  totalTax = computed(() =>
    this.itemLines().reduce((sum, l) => sum + l.total_tax, 0),
  );

  totalAmount = computed(
    () => this.subtotal() + this.totalTax() - this.discount,
  );

  dueAmount = computed(
    () => Math.max(0, this.totalAmount() - this.paidAmount),
  );

  async ngOnInit(): Promise<void> {
    // Load bank accounts
    const bizUuid = this.authStore.activeBusinessUuid();
    if (bizUuid) {
      const accs = await this.pouchDb.findByBusiness<IBankAccount>(ETables.BANK_ACCOUNT, bizUuid);
      this.bankAccounts.set(accs);
    }

    const t = this.transaction();
    if (t) {
      this.transactionMode = (t.transaction_mode as ETransactionMode) || ETransactionMode.CASH;
      this.partyUuid = t.party_uuid || '';
      this.txDate = t.transaction_date
        ? new Date(t.transaction_date).toISOString().split('T')[0]
        : this.txDate;
      this.invoiceNo = t.invoice_no || t.order_number || '';
      this.discount = t.discount || 0;
      this.paidAmount = t.paid_amount || 0;
      this.paymentType = (t.payment_type as EPaymentType) || EPaymentType.CASH;
      this.chequeRefNo = t.cheque_ref_no || '';
      this.description = t.description || '';
      // TODO: Load item lines from PouchDB for edit mode
    } else {
      // Default party selection
      const parties = this.availableParties();
      if (parties.length > 0) {
        this.partyUuid = parties[0].uuid;
      }
    }
  }

  addLine(): void {
    if (!this.newItemUuid) {
      this.error.set('Select a product to add');
      return;
    }
    const product = this.catalogStore
      .products()
      .find((p) => p.uuid === this.newItemUuid);
    if (!product) return;

    if (this.newQty <= 0) {
      this.error.set('Quantity must be greater than zero');
      return;
    }

    if (this.newPrice < 0) {
      this.error.set('Price cannot be negative');
      return;
    }

    this.error.set('');
    const qty = this.newQty || 1;
    const isSales = this.isSalesType();
    const price =
      this.newPrice ||
      (isSales ? product.sales_price : product.purchase_price) ||
      0;
    const taxRate = product.item_wise_tax || 0;
    const totalTax = (qty * price * taxRate) / 100;
    const netAmount = qty * price + totalTax;

    const line: ItemLine = {
      item_uuid: product.uuid,
      product_name: product.name || 'Unknown',
      quantity: qty,
      price,
      item_wise_tax: taxRate,
      total_tax: totalTax,
      net_amount: netAmount,
    };

    this.itemLines.update((lines) => [...lines, line]);
    this.newItemUuid = '';
    this.newQty = 1;
    this.newPrice = 0;
    this.recalculate();
  }

  removeLine(index: number): void {
    this.itemLines.update((lines) => lines.filter((_, i) => i !== index));
    this.recalculate();
  }

  recalculate(): void {
    if (this.transactionMode === ETransactionMode.CASH) {
      this.paidAmount = this.totalAmount();
    }
  }

  async save(): Promise<void> {
    if (!this.partyUuid) {
      this.error.set(`${this.partyLabel()} is required`);
      return;
    }

    if (!this.txDate) {
      this.error.set('Transaction date is required');
      return;
    }

    const txDateObj = new Date(this.txDate);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (txDateObj > today) {
      this.error.set('Transaction date cannot be in the future');
      return;
    }

    if (!this.isPayment() && this.itemLines().length === 0) {
      this.error.set('At least one item is required');
      return;
    }

    if (this.isPayment() && this.paidAmount <= 0) {
      this.error.set('Amount must be greater than zero');
      return;
    }

    if (!this.isPayment() && this.paidAmount < 0) {
      this.error.set('Paid amount cannot be negative');
      return;
    }

    if (this.discount < 0) {
      this.error.set('Discount cannot be negative');
      return;
    }

    if (!this.isPayment() && this.discount > this.subtotal() + this.totalTax()) {
      this.error.set('Discount cannot exceed the subtotal');
      return;
    }

    if (this.paymentType === EPaymentType.CHEQUE && !this.chequeRefNo.trim()) {
      this.error.set('Cheque reference number is required for cheque payments');
      return;
    }

    if ((this.paymentType === EPaymentType.BKASH || this.paymentType === EPaymentType.NAGAD || this.paymentType === EPaymentType.ROCKET) && !this.chequeRefNo.trim()) {
      this.error.set('Transaction ID is required for mobile banking payments');
      return;
    }

    this.saving.set(true);
    this.error.set('');

    const lines = this.itemLines();
    const total = this.isPayment()
      ? this.paidAmount
      : this.subtotal() + this.totalTax() - this.discount;
    const paid = this.paidAmount;
    const due = this.isPayment() ? 0 : Math.max(0, total - paid);

    const txData: Partial<ITransaction> = {
      type: this.txType(),
      party_uuid: this.partyUuid,
      transaction_date: new Date(this.txDate).getTime(),
      transaction_mode: this.transactionMode,
      description: this.description.trim() || null,
      invoice_no: this.invoiceNo.trim() || null,
      order_number: this.invoiceNo.trim() || null,
      payment_type: this.paymentType.startsWith('Bank:') ? 'Bank' : this.paymentType,
      bank_account_uuid: this.paymentType.startsWith('Bank:') ? this.paymentType.split(':')[1] : null,
      cheque_ref_no: this.chequeRefNo.trim() || null,
      discount: this.discount,
      total_amount: total,
      paid_amount: paid,
      due_amount: due,
      quantity: lines.reduce((s, l) => s + l.quantity, 0),
      total_tax: lines.reduce((s, l) => s + l.total_tax, 0),
    };

    const txItems: Partial<ITransactionItem>[] = lines.map((l) => ({
      item_uuid: l.item_uuid,
      quantity: l.quantity,
      purchase_price: this.isSalesType() ? 0 : l.price,
      sales_price: this.isSalesType() ? l.price : 0,
      item_wise_tax: l.item_wise_tax,
      total_tax: l.total_tax,
    }));

    try {
      const existing = this.transaction();
      if (existing) {
        await this.transactionStore.updateTransaction(
          existing.uuid,
          txData,
          txItems,
        );
      } else {
        await this.transactionStore.addTransaction(txData, txItems);
      }
      this.saved.emit();
    } catch (err) {
      this.error.set('Failed to save transaction');
      this.saving.set(false);
    }
  }
}
