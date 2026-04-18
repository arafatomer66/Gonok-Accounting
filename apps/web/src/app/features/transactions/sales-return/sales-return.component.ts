import { Component, inject, signal, OnInit } from '@angular/core';
import { TransactionStore } from '../../../core/stores/transaction.store';
import { CatalogStore } from '../../../core/stores/catalog.store';
import { TransactionListComponent } from '../../../shared/components/transaction-list/transaction-list.component';
import { TransactionFormComponent } from '../../../shared/components/transaction-form/transaction-form.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { ITransaction, ETransactionType } from '@org/shared-types';

@Component({
  selector: 'gonok-sales-return',
  standalone: true,
  imports: [TransactionListComponent, TransactionFormComponent, ConfirmDialogComponent],
  template: `
    <div class="page-header">
      <h1 class="page-header__title">Sales Returns</h1>
      <button class="btn btn--primary" (click)="openForm()">+ New Sales Return</button>
    </div>

    <gonok-transaction-list
      [transactions]="transactionStore.salesReturns()"
      partyLabel="Customer"
      invoiceLabel="Return No"
      emptyMessage="No sales return transactions yet."
      (edit)="editTx($event)"
      (delete)="confirmDelete($event)"
    />

    @if (showForm()) {
      <gonok-transaction-form
        [txType]="txType"
        [transaction]="editingTx()"
        (saved)="onSaved()"
        (cancelled)="closeForm()"
      />
    }

    <gonok-confirm-dialog
      [visible]="showDeleteConfirm()"
      title="Delete Sales Return"
      message="Delete this sales return? Stock and balance will be reversed."
      confirmLabel="Delete"
      variant="danger"
      (confirmed)="doDelete()"
      (cancelled)="showDeleteConfirm.set(false)"
    />
  `,
})
export class SalesReturnComponent implements OnInit {
  transactionStore = inject(TransactionStore);
  private catalogStore = inject(CatalogStore);

  txType = ETransactionType.SALES_RETURN;
  showForm = signal(false);
  editingTx = signal<ITransaction | null>(null);
  showDeleteConfirm = signal(false);
  deletingTx = signal<ITransaction | null>(null);

  ngOnInit(): void {
    if (!this.catalogStore.initialized()) this.catalogStore.loadAll();
    if (!this.transactionStore.initialized()) this.transactionStore.loadAll();
  }

  openForm(): void {
    this.editingTx.set(null);
    this.showForm.set(true);
  }

  editTx(tx: ITransaction): void {
    this.editingTx.set(tx);
    this.showForm.set(true);
  }

  closeForm(): void {
    this.showForm.set(false);
    this.editingTx.set(null);
  }

  onSaved(): void {
    this.closeForm();
  }

  confirmDelete(tx: ITransaction): void {
    this.deletingTx.set(tx);
    this.showDeleteConfirm.set(true);
  }

  async doDelete(): Promise<void> {
    const tx = this.deletingTx();
    if (tx) await this.transactionStore.deleteTransaction(tx.uuid);
    this.showDeleteConfirm.set(false);
    this.deletingTx.set(null);
  }
}
