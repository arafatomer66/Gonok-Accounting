import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DecimalPipe, DatePipe, TitleCasePipe } from '@angular/common';
import { PouchDbService } from '../../core/services/pouchdb.service';
import { AuthStore } from '../../core/stores/auth.store';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { ETables } from '@org/shared-types';

interface IBankAccount {
  uuid: string;
  table_type: string;
  business_uuid: string;
  bank_name: string;
  account_name: string;
  account_number: string;
  branch: string | null;
  opening_balance: number;
  current_balance: number;
  active: boolean;
  created_at: number;
  updated_at: number;
}

interface IBankTransaction {
  uuid: string;
  table_type: string;
  business_uuid: string;
  account_uuid: string;
  type: 'deposit' | 'withdrawal' | 'transfer';
  amount: number;
  description: string | null;
  reference_no: string | null;
  transaction_date: number;
  created_at: number;
  updated_at: number;
}

@Component({
  selector: 'gonok-bank',
  standalone: true,
  imports: [FormsModule, DecimalPipe, DatePipe, TitleCasePipe, ConfirmDialogComponent],
  template: `
    <div class="page-header">
      <h1 class="page-header__title">Bank Transactions</h1>
      <div class="page-header__actions">
        <button class="btn btn--secondary" (click)="openAccountForm()">+ Add Account</button>
        <button class="btn btn--primary" (click)="openTxForm()" [disabled]="accounts().length === 0">+ New Transaction</button>
      </div>
    </div>

    <!-- Account Cards -->
    @if (accounts().length > 0) {
      <div class="account-cards">
        @for (acc of accounts(); track acc.uuid) {
          <div class="card card--stat account-card" [class.account-card--active]="selectedAccount() === acc.uuid" (click)="selectedAccount.set(acc.uuid)">
            <div class="account-card__header">
              <span class="card__label">{{ acc.bank_name }}</span>
              @if (!acc.active) {
                <span class="badge badge--neutral">Inactive</span>
              }
            </div>
            <div class="card__value">&#2547;{{ acc.current_balance | number:'1.2-2' }}</div>
            <div class="account-card__detail">{{ acc.account_name }} &middot; {{ acc.account_number }}</div>
            <div class="account-card__actions">
              <button class="btn btn--sm btn--ghost" (click)="editAccount(acc); $event.stopPropagation()">Edit</button>
              <button class="btn btn--sm btn--ghost btn--danger-text" (click)="confirmDeleteAccount(acc); $event.stopPropagation()">Delete</button>
            </div>
          </div>
        }
      </div>
    } @else {
      <div class="card">
        <p class="text-muted text-center">No bank accounts yet. Add one to start tracking bank transactions.</p>
      </div>
    }

    <!-- Transactions Table -->
    @if (selectedAccount()) {
      <h3 class="section-title">Transactions — {{ getAccountName(selectedAccount()!) }}</h3>
      <div class="table-wrapper">
        <table class="table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Description</th>
              <th>Reference</th>
              <th class="text-right">Amount</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            @for (tx of filteredTransactions(); track tx.uuid) {
              <tr>
                <td>{{ tx.transaction_date | date:'dd/MM/yyyy' }}</td>
                <td>
                  <span class="badge"
                    [class.badge--success]="tx.type === 'deposit'"
                    [class.badge--danger]="tx.type === 'withdrawal'"
                    [class.badge--info]="tx.type === 'transfer'"
                  >{{ tx.type | titlecase }}</span>
                </td>
                <td>{{ tx.description || '-' }}</td>
                <td>{{ tx.reference_no || '-' }}</td>
                <td class="col-amount" [class.text-success]="tx.type === 'deposit'" [class.text-danger]="tx.type === 'withdrawal'">
                  {{ tx.type === 'deposit' ? '+' : '-' }}&#2547;{{ tx.amount | number:'1.2-2' }}
                </td>
                <td>
                  <button class="btn btn--sm btn--ghost btn--danger-text" (click)="confirmDeleteTx(tx)">Delete</button>
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="6" class="text-center text-muted">No transactions for this account.</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }

    <!-- Account Form Modal -->
    @if (showAccountForm()) {
      <div class="modal-backdrop" (click)="closeAccountForm()">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal__header">
            <h3 class="modal__title">{{ editingAccount() ? 'Edit Account' : 'Add Bank Account' }}</h3>
            <button class="modal__close" (click)="closeAccountForm()">&times;</button>
          </div>
          <div class="modal__body">
            <div class="form-group">
              <label class="form-label">Bank Name *</label>
              <input class="form-input" type="text" [(ngModel)]="accBankName" name="bankName" placeholder="e.g. Sonali Bank" />
            </div>
            <div class="form-group">
              <label class="form-label">Account Name *</label>
              <input class="form-input" type="text" [(ngModel)]="accName" name="accName" placeholder="Account holder name" />
            </div>
            <div class="form-group">
              <label class="form-label">Account Number *</label>
              <input class="form-input" type="text" [(ngModel)]="accNumber" name="accNumber" placeholder="Account number" />
            </div>
            <div class="form-group">
              <label class="form-label">Branch</label>
              <input class="form-input" type="text" [(ngModel)]="accBranch" name="branch" placeholder="Branch name" />
            </div>
            <div class="form-group">
              <label class="form-label">Opening Balance</label>
              <input class="form-input" type="number" [(ngModel)]="accOpeningBalance" name="openBal" min="0" step="0.01" />
            </div>
            @if (accFormError()) {
              <p class="form-error">{{ accFormError() }}</p>
            }
          </div>
          <div class="modal__footer">
            <button class="btn btn--ghost" type="button" (click)="closeAccountForm()">Cancel</button>
            <button class="btn btn--primary" (click)="saveAccount()" [disabled]="saving()">
              {{ saving() ? 'Saving...' : 'Save' }}
            </button>
          </div>
        </div>
      </div>
    }

    <!-- Transaction Form Modal -->
    @if (showTxForm()) {
      <div class="modal-backdrop" (click)="closeTxForm()">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal__header">
            <h3 class="modal__title">New Bank Transaction</h3>
            <button class="modal__close" (click)="closeTxForm()">&times;</button>
          </div>
          <div class="modal__body">
            <div class="form-group">
              <label class="form-label">Account *</label>
              <select class="form-input" [(ngModel)]="txAccountUuid" name="txAccount">
                @for (acc of accounts(); track acc.uuid) {
                  <option [value]="acc.uuid">{{ acc.bank_name }} — {{ acc.account_number }}</option>
                }
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Type *</label>
              <select class="form-input" [(ngModel)]="txType" name="txType">
                <option value="deposit">Deposit</option>
                <option value="withdrawal">Withdrawal</option>
                <option value="transfer">Transfer</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Amount *</label>
              <input class="form-input" type="number" [(ngModel)]="txAmount" name="txAmount" min="0.01" step="0.01" placeholder="0.00" />
            </div>
            <div class="form-group">
              <label class="form-label">Date</label>
              <input class="form-input" type="date" [(ngModel)]="txDate" name="txDate" />
            </div>
            <div class="form-group">
              <label class="form-label">Reference No</label>
              <input class="form-input" type="text" [(ngModel)]="txRefNo" name="txRefNo" placeholder="Cheque no, slip no, etc." />
            </div>
            <div class="form-group">
              <label class="form-label">Description</label>
              <textarea class="form-input" [(ngModel)]="txDescription" name="txDesc" rows="2" placeholder="Optional"></textarea>
            </div>
            @if (txFormError()) {
              <p class="form-error">{{ txFormError() }}</p>
            }
          </div>
          <div class="modal__footer">
            <button class="btn btn--ghost" type="button" (click)="closeTxForm()">Cancel</button>
            <button class="btn btn--primary" (click)="saveTx()" [disabled]="saving()">
              {{ saving() ? 'Saving...' : 'Save' }}
            </button>
          </div>
        </div>
      </div>
    }

    <gonok-confirm-dialog
      [visible]="showDeleteConfirm()"
      [title]="deleteType() === 'account' ? 'Delete Account' : 'Delete Transaction'"
      [message]="deleteType() === 'account' ? 'Delete this bank account and all its transactions?' : 'Delete this transaction?'"
      confirmLabel="Delete"
      variant="danger"
      (confirmed)="doDelete()"
      (cancelled)="showDeleteConfirm.set(false)"
    />
  `,
  styles: `
    @use '../../../styles/abstracts/variables' as *;

    .account-cards {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: $space-5;
      margin-bottom: $space-6;
    }
    .account-card {
      cursor: pointer;
      transition: all 200ms ease;
      &--active {
        border-color: $color-primary;
        box-shadow: 0 0 0 2px rgba($color-primary, 0.15);
      }
      &__header {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      &__detail {
        font-size: $font-size-xs;
        color: $color-text-secondary;
        margin-top: $space-1;
      }
      &__actions {
        display: flex;
        gap: $space-1;
        margin-top: $space-2;
      }
    }
    .section-title {
      font-size: $font-size-md;
      font-weight: $font-weight-semibold;
      margin-bottom: $space-4;
      color: $color-gray-800;
    }
    .text-success { color: $color-success; }
    .text-danger { color: $color-danger; }
    .text-center { text-align: center; }
    .text-muted { color: $color-text-secondary; }
    .btn--danger-text {
      color: $color-danger;
      &:hover { background: rgba($color-danger, 0.08); }
    }
    .form-group { margin-bottom: $space-4; }
  `,
})
export class BankComponent implements OnInit {
  private pouchDb = inject(PouchDbService);
  private authStore = inject(AuthStore);

  accounts = signal<IBankAccount[]>([]);
  transactions = signal<IBankTransaction[]>([]);
  selectedAccount = signal<string | null>(null);
  showAccountForm = signal(false);
  showTxForm = signal(false);
  showDeleteConfirm = signal(false);
  editingAccount = signal<IBankAccount | null>(null);
  deletingItem = signal<IBankAccount | IBankTransaction | null>(null);
  deleteType = signal<'account' | 'transaction'>('account');
  saving = signal(false);
  accFormError = signal('');
  txFormError = signal('');

  // Account form
  accBankName = '';
  accName = '';
  accNumber = '';
  accBranch = '';
  accOpeningBalance = 0;

  // Transaction form
  txAccountUuid = '';
  txType: 'deposit' | 'withdrawal' | 'transfer' = 'deposit';
  txAmount = 0;
  txDate = new Date().toISOString().split('T')[0];
  txRefNo = '';
  txDescription = '';

  filteredTransactions = computed(() => {
    const accUuid = this.selectedAccount();
    if (!accUuid) return [];
    return [...this.transactions()]
      .filter((t) => t.account_uuid === accUuid)
      .sort((a, b) => b.transaction_date - a.transaction_date);
  });

  async ngOnInit(): Promise<void> {
    await this.loadAll();
  }

  async loadAll(): Promise<void> {
    const bizUuid = this.authStore.activeBusinessUuid();
    if (!bizUuid) return;
    const [accs, txs] = await Promise.all([
      this.pouchDb.findByBusiness<IBankAccount>(ETables.BANK_ACCOUNT, bizUuid),
      this.pouchDb.findByBusiness<IBankTransaction>(ETables.BANK_TRANSACTION, bizUuid),
    ]);
    this.accounts.set(accs);
    this.transactions.set(txs);
    if (accs.length > 0 && !this.selectedAccount()) {
      this.selectedAccount.set(accs[0].uuid);
    }
  }

  getAccountName(uuid: string): string {
    const acc = this.accounts().find((a) => a.uuid === uuid);
    return acc ? `${acc.bank_name} — ${acc.account_number}` : '';
  }

  // ─── Account CRUD ──────────────────────────────────

  openAccountForm(): void {
    this.editingAccount.set(null);
    this.accBankName = '';
    this.accName = '';
    this.accNumber = '';
    this.accBranch = '';
    this.accOpeningBalance = 0;
    this.accFormError.set('');
    this.showAccountForm.set(true);
  }

  editAccount(acc: IBankAccount): void {
    this.editingAccount.set(acc);
    this.accBankName = acc.bank_name;
    this.accName = acc.account_name;
    this.accNumber = acc.account_number;
    this.accBranch = acc.branch || '';
    this.accOpeningBalance = acc.opening_balance;
    this.accFormError.set('');
    this.showAccountForm.set(true);
  }

  closeAccountForm(): void {
    this.showAccountForm.set(false);
    this.editingAccount.set(null);
  }

  async saveAccount(): Promise<void> {
    if (!this.accBankName.trim()) {
      this.accFormError.set('Bank name is required');
      return;
    }
    if (!this.accName.trim()) {
      this.accFormError.set('Account name is required');
      return;
    }
    if (!this.accNumber.trim()) {
      this.accFormError.set('Account number is required');
      return;
    }
    if (this.accOpeningBalance < 0) {
      this.accFormError.set('Opening balance cannot be negative');
      return;
    }

    // Check duplicate account number
    const editing = this.editingAccount();
    const dup = this.accounts().some(
      (a) => a.uuid !== editing?.uuid && a.account_number === this.accNumber.trim(),
    );
    if (dup) {
      this.accFormError.set('An account with this number already exists');
      return;
    }

    const bizUuid = this.authStore.activeBusinessUuid();
    if (!bizUuid) return;

    this.saving.set(true);
    this.accFormError.set('');

    const uuid = editing?.uuid || crypto.randomUUID();
    const now = Date.now();

    // Calculate current balance from transactions
    let currentBalance = this.accOpeningBalance;
    if (editing) {
      const txs = this.transactions().filter((t) => t.account_uuid === uuid);
      currentBalance = this.accOpeningBalance;
      for (const tx of txs) {
        currentBalance += tx.type === 'deposit' ? tx.amount : -tx.amount;
      }
    }

    const acc: IBankAccount = {
      uuid,
      table_type: ETables.BANK_ACCOUNT,
      business_uuid: bizUuid,
      bank_name: this.accBankName.trim(),
      account_name: this.accName.trim(),
      account_number: this.accNumber.trim(),
      branch: this.accBranch.trim() || null,
      opening_balance: this.accOpeningBalance,
      current_balance: currentBalance,
      active: true,
      created_at: editing?.created_at || now,
      updated_at: now,
    };

    await this.pouchDb.put(ETables.BANK_ACCOUNT, uuid, acc as unknown as Record<string, unknown>);
    this.closeAccountForm();
    await this.loadAll();
    this.selectedAccount.set(uuid);
    this.saving.set(false);
  }

  // ─── Transaction CRUD ──────────────────────────────

  openTxForm(): void {
    this.txAccountUuid = this.selectedAccount() || this.accounts()[0]?.uuid || '';
    this.txType = 'deposit';
    this.txAmount = 0;
    this.txDate = new Date().toISOString().split('T')[0];
    this.txRefNo = '';
    this.txDescription = '';
    this.txFormError.set('');
    this.showTxForm.set(true);
  }

  closeTxForm(): void {
    this.showTxForm.set(false);
  }

  async saveTx(): Promise<void> {
    if (!this.txAccountUuid) {
      this.txFormError.set('Select a bank account');
      return;
    }
    if (this.txAmount <= 0) {
      this.txFormError.set('Amount must be greater than zero');
      return;
    }
    if (!this.txDate) {
      this.txFormError.set('Date is required');
      return;
    }
    const txDateObj = new Date(this.txDate);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (txDateObj > today) {
      this.txFormError.set('Date cannot be in the future');
      return;
    }

    // Check sufficient balance for withdrawal
    if (this.txType === 'withdrawal' || this.txType === 'transfer') {
      const acc = this.accounts().find((a) => a.uuid === this.txAccountUuid);
      if (acc && this.txAmount > acc.current_balance) {
        this.txFormError.set('Insufficient balance in this account');
        return;
      }
    }

    const bizUuid = this.authStore.activeBusinessUuid();
    if (!bizUuid) return;

    this.saving.set(true);
    this.txFormError.set('');

    const uuid = crypto.randomUUID();
    const now = Date.now();

    const tx: IBankTransaction = {
      uuid,
      table_type: ETables.BANK_TRANSACTION,
      business_uuid: bizUuid,
      account_uuid: this.txAccountUuid,
      type: this.txType,
      amount: this.txAmount,
      description: this.txDescription.trim() || null,
      reference_no: this.txRefNo.trim() || null,
      transaction_date: new Date(this.txDate).getTime(),
      created_at: now,
      updated_at: now,
    };

    await this.pouchDb.put(ETables.BANK_TRANSACTION, uuid, tx as unknown as Record<string, unknown>);

    // Update account balance
    const acc = this.accounts().find((a) => a.uuid === this.txAccountUuid);
    if (acc) {
      const newBalance = acc.current_balance + (this.txType === 'deposit' ? this.txAmount : -this.txAmount);
      const updatedAcc = { ...acc, current_balance: newBalance, updated_at: now };
      await this.pouchDb.put(ETables.BANK_ACCOUNT, acc.uuid, updatedAcc as unknown as Record<string, unknown>);
    }

    this.closeTxForm();
    await this.loadAll();
    this.saving.set(false);
  }

  // ─── Delete ────────────────────────────────────────

  confirmDeleteAccount(acc: IBankAccount): void {
    this.deletingItem.set(acc);
    this.deleteType.set('account');
    this.showDeleteConfirm.set(true);
  }

  confirmDeleteTx(tx: IBankTransaction): void {
    this.deletingItem.set(tx);
    this.deleteType.set('transaction');
    this.showDeleteConfirm.set(true);
  }

  async doDelete(): Promise<void> {
    const item = this.deletingItem();
    if (!item) return;

    if (this.deleteType() === 'account') {
      const acc = item as IBankAccount;
      // Delete all transactions for this account
      const txs = this.transactions().filter((t) => t.account_uuid === acc.uuid);
      for (const tx of txs) {
        await this.pouchDb.remove(ETables.BANK_TRANSACTION, tx.uuid);
      }
      await this.pouchDb.remove(ETables.BANK_ACCOUNT, acc.uuid);
      if (this.selectedAccount() === acc.uuid) {
        this.selectedAccount.set(null);
      }
    } else {
      const tx = item as IBankTransaction;
      await this.pouchDb.remove(ETables.BANK_TRANSACTION, tx.uuid);
      // Update account balance
      const acc = this.accounts().find((a) => a.uuid === tx.account_uuid);
      if (acc) {
        const adjust = tx.type === 'deposit' ? -tx.amount : tx.amount;
        const updatedAcc = { ...acc, current_balance: acc.current_balance + adjust, updated_at: Date.now() };
        await this.pouchDb.put(ETables.BANK_ACCOUNT, acc.uuid, updatedAcc as unknown as Record<string, unknown>);
      }
    }

    this.showDeleteConfirm.set(false);
    this.deletingItem.set(null);
    await this.loadAll();
  }
}
