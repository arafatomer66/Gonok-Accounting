import { Component, inject, computed, OnInit } from '@angular/core';
import { DecimalPipe, DatePipe } from '@angular/common';
import { TransactionStore } from '../../core/stores/transaction.store';
import { CatalogStore } from '../../core/stores/catalog.store';
import { ExpenseStore } from '../../core/stores/expense.store';

@Component({
  selector: 'gonok-dashboard',
  standalone: true,
  imports: [DecimalPipe, DatePipe],
  template: `
    <div class="page-header">
      <h1 class="page-header__title">Dashboard</h1>
    </div>

    <div class="dashboard-grid">
      <div class="card card--stat">
        <div class="card__label">Total Sales</div>
        <div class="card__value">&#2547;{{ totalSales() | number:'1.2-2' }}</div>
      </div>
      <div class="card card--stat">
        <div class="card__label">Total Purchase</div>
        <div class="card__value">&#2547;{{ totalPurchase() | number:'1.2-2' }}</div>
      </div>
      <div class="card card--stat">
        <div class="card__label">Total Expenses</div>
        <div class="card__value">&#2547;{{ expenseStore.totalExpenses() | number:'1.2-2' }}</div>
      </div>
      <div class="card card--stat">
        <div class="card__label">Stock Value</div>
        <div class="card__value">&#2547;{{ catalogStore.totalStockValue() | number:'1.2-2' }}</div>
      </div>
    </div>

    <div class="dashboard-grid mt-4">
      <div class="card card--stat">
        <div class="card__label">Receivable</div>
        <div class="card__value card__value--success">&#2547;{{ totalReceivable() | number:'1.2-2' }}</div>
      </div>
      <div class="card card--stat">
        <div class="card__label">Payable</div>
        <div class="card__value card__value--danger">&#2547;{{ totalPayable() | number:'1.2-2' }}</div>
      </div>
      <div class="card card--stat">
        <div class="card__label">Products</div>
        <div class="card__value">{{ catalogStore.products().length }}</div>
      </div>
      <div class="card card--stat">
        <div class="card__label">Parties</div>
        <div class="card__value">{{ catalogStore.parties().length }}</div>
      </div>
    </div>

    <div class="card mt-4">
      <div class="card__header">
        <h3 class="card__title">Recent Transactions</h3>
      </div>
      <div class="card__body">
        @if (recentTransactions().length === 0) {
          <p class="text-muted">No transactions yet. Start by adding products and parties.</p>
        } @else {
          <div class="table-wrapper">
            <table class="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Invoice</th>
                  <th class="text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                @for (tx of recentTransactions(); track tx.uuid) {
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
                    <td class="col-amount">&#2547;{{ tx.total_amount | number:'1.2-2' }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>
    </div>
  `,
  styles: `
    @use '../../../styles/abstracts/variables' as *;

    .dashboard-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: $space-5;
    }
    .mt-4 { margin-top: $space-6; }
    .text-muted { color: $color-text-secondary; }
    .card__value--success { color: $color-success; }
    .card__value--danger { color: $color-danger; }
  `,
})
export class DashboardComponent implements OnInit {
  private transactionStore = inject(TransactionStore);
  catalogStore = inject(CatalogStore);
  expenseStore = inject(ExpenseStore);

  totalSales = computed(() =>
    this.transactionStore.sales().reduce((s, t) => s + (t.total_amount || 0), 0),
  );

  totalPurchase = computed(() =>
    this.transactionStore.purchases().reduce((s, t) => s + (t.total_amount || 0), 0),
  );

  totalReceivable = computed(() =>
    this.catalogStore.customers().reduce((s, p) => s + Math.max(0, p.current_balance || 0), 0),
  );

  totalPayable = computed(() =>
    this.catalogStore.suppliers().reduce((s, p) => s + Math.max(0, p.current_balance || 0), 0),
  );

  recentTransactions = computed(() =>
    [...this.transactionStore.transactions()]
      .sort((a, b) => b.transaction_date - a.transaction_date)
      .slice(0, 10),
  );

  ngOnInit(): void {
    if (!this.catalogStore.initialized()) this.catalogStore.loadAll();
    if (!this.transactionStore.initialized()) this.transactionStore.loadAll();
    if (!this.expenseStore.initialized()) this.expenseStore.loadAll();
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
