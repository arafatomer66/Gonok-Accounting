import { Component, inject, computed, signal, OnInit } from '@angular/core';
import { DecimalPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TransactionStore } from '../../../core/stores/transaction.store';
import { CatalogStore } from '../../../core/stores/catalog.store';
import { ETransactionType } from '@org/shared-types';

@Component({
  selector: 'gonok-daybook',
  standalone: true,
  imports: [DecimalPipe, DatePipe, FormsModule, RouterLink],
  template: `
    <div class="page-header">
      <a routerLink="../" class="btn btn--ghost btn--sm">&larr; Reports</a>
      <h1 class="page-header__title">Day Book</h1>
    </div>

    <div class="filter-bar">
      <div class="form-group">
        <label class="form-label">From Date</label>
        <input type="date" class="form-input" [(ngModel)]="startDate" />
      </div>
      <div class="form-group">
        <label class="form-label">To Date</label>
        <input type="date" class="form-input" [(ngModel)]="endDate" />
      </div>
    </div>

    <div class="table-wrapper">
      <table class="table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Type</th>
            <th>Ref No</th>
            <th>Party</th>
            <th class="col-amount">Amount</th>
          </tr>
        </thead>
        <tbody>
          @for (tx of filteredTransactions(); track tx.uuid) {
            <tr>
              <td>{{ tx.transaction_date | date:'dd/MM/yyyy' }}</td>
              <td>
                <span class="badge"
                  [class.badge--success]="tx.type === 'sales' || tx.type === 'payment_in'"
                  [class.badge--warning]="tx.type === 'purchase' || tx.type === 'payment_out'"
                  [class.badge--info]="tx.type === 'sales_return' || tx.type === 'purchase_return'"
                >{{ formatType(tx.type) }}</span>
              </td>
              <td>{{ tx.invoice_no || tx.order_number || '-' }}</td>
              <td>{{ getPartyName(tx.party_uuid) }}</td>
              <td class="col-amount">&#2547;{{ tx.total_amount | number:'1.2-2' }}</td>
            </tr>
          } @empty {
            <tr>
              <td colspan="5" class="text-center text-muted">No transactions found for the selected dates.</td>
            </tr>
          }
        </tbody>
      </table>
    </div>

    <div class="summary-bar">
      <div class="summary-item">
        <span class="summary-label">Transactions</span>
        <span class="summary-value">{{ filteredTransactions().length }}</span>
      </div>
      <div class="summary-item">
        <span class="summary-label">Total Inflow</span>
        <span class="summary-value summary-value--success">&#2547;{{ totalInflow() | number:'1.2-2' }}</span>
      </div>
      <div class="summary-item">
        <span class="summary-label">Total Outflow</span>
        <span class="summary-value summary-value--danger">&#2547;{{ totalOutflow() | number:'1.2-2' }}</span>
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

      .form-group {
        min-width: 180px;
        flex: 1;
        max-width: 250px;
      }
    }

    .text-center { text-align: center; }
    .text-muted { color: $color-text-secondary; }

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
    .summary-value--danger { color: $color-danger; }
  `,
})
export class DaybookComponent implements OnInit {
  private transactionStore = inject(TransactionStore);
  private catalogStore = inject(CatalogStore);

  startDate = signal('');
  endDate = signal('');

  filteredTransactions = computed(() => {
    let txs = this.transactionStore.transactions();
    const start = this.startDate()
      ? new Date(this.startDate()).setHours(0, 0, 0, 0)
      : 0;
    const end = this.endDate()
      ? new Date(this.endDate()).setHours(23, 59, 59, 999)
      : Infinity;

    txs = txs.filter(
      (t) => t.transaction_date >= start && t.transaction_date <= end,
    );
    return [...txs].sort(
      (a, b) => b.transaction_date - a.transaction_date,
    );
  });

  totalInflow = computed(() =>
    this.filteredTransactions()
      .filter(
        (t) =>
          t.type === ETransactionType.SALES ||
          t.type === ETransactionType.PAYMENT_IN ||
          t.type === ETransactionType.PURCHASE_RETURN,
      )
      .reduce((s, t) => s + (t.total_amount || 0), 0),
  );

  totalOutflow = computed(() =>
    this.filteredTransactions()
      .filter(
        (t) =>
          t.type === ETransactionType.PURCHASE ||
          t.type === ETransactionType.PAYMENT_OUT ||
          t.type === ETransactionType.SALES_RETURN,
      )
      .reduce((s, t) => s + (t.total_amount || 0), 0),
  );

  ngOnInit(): void {
    if (!this.transactionStore.initialized()) this.transactionStore.loadAll();
    if (!this.catalogStore.initialized()) this.catalogStore.loadAll();
  }

  getPartyName(uuid: string | null): string {
    if (!uuid) return '-';
    const party = this.catalogStore.allParties().find((p) => p.uuid === uuid);
    return party?.name || '-';
  }

  formatType(type: string | null): string {
    const labels: Record<string, string> = {
      sales: 'Sale',
      purchase: 'Purchase',
      sales_return: 'Sales Return',
      purchase_return: 'Purchase Return',
      payment_in: 'Payment In',
      payment_out: 'Payment Out',
    };
    return labels[type || ''] || type || '-';
  }
}
