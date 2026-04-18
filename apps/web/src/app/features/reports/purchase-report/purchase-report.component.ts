import { Component, inject, computed, signal, OnInit } from '@angular/core';
import { DecimalPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TransactionStore } from '../../../core/stores/transaction.store';
import { CatalogStore } from '../../../core/stores/catalog.store';

@Component({
  selector: 'gonok-purchase-report',
  standalone: true,
  imports: [DecimalPipe, DatePipe, FormsModule, RouterLink],
  template: `
    <div class="page-header">
      <a routerLink="../" class="btn btn--ghost btn--sm">&larr; Reports</a>
      <h1 class="page-header__title">Purchase Report</h1>
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
      <div class="form-group">
        <label class="form-label">Supplier</label>
        <select class="form-input" [(ngModel)]="partyFilter">
          <option value="">All Suppliers</option>
          @for (party of catalogStore.allParties(); track party.uuid) {
            <option [value]="party.uuid">{{ party.name }}</option>
          }
        </select>
      </div>
    </div>

    <div class="table-wrapper">
      <table class="table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Bill No</th>
            <th>Supplier</th>
            <th>Mode</th>
            <th class="col-amount">Amount</th>
            <th class="col-amount">Paid</th>
            <th class="col-amount">Due</th>
          </tr>
        </thead>
        <tbody>
          @for (tx of filteredPurchases(); track tx.uuid) {
            <tr>
              <td>{{ tx.transaction_date | date:'dd/MM/yyyy' }}</td>
              <td>{{ tx.bill_no || tx.invoice_no || '-' }}</td>
              <td>{{ getPartyName(tx.party_uuid) }}</td>
              <td>
                <span class="badge" [class.badge--success]="tx.transaction_mode === 'cash'" [class.badge--warning]="tx.transaction_mode === 'credit'">
                  {{ tx.transaction_mode || 'Cash' }}
                </span>
              </td>
              <td class="col-amount">&#2547;{{ tx.total_amount | number:'1.2-2' }}</td>
              <td class="col-amount">&#2547;{{ tx.paid_amount | number:'1.2-2' }}</td>
              <td class="col-amount">&#2547;{{ tx.due_amount | number:'1.2-2' }}</td>
            </tr>
          } @empty {
            <tr>
              <td colspan="7" class="text-center text-muted">No purchases found for the selected filters.</td>
            </tr>
          }
        </tbody>
      </table>
    </div>

    <div class="summary-bar">
      <div class="summary-item">
        <span class="summary-label">Transactions</span>
        <span class="summary-value">{{ filteredPurchases().length }}</span>
      </div>
      <div class="summary-item">
        <span class="summary-label">Total Amount</span>
        <span class="summary-value">&#2547;{{ totalAmount() | number:'1.2-2' }}</span>
      </div>
      <div class="summary-item">
        <span class="summary-label">Total Paid</span>
        <span class="summary-value summary-value--success">&#2547;{{ totalPaid() | number:'1.2-2' }}</span>
      </div>
      <div class="summary-item">
        <span class="summary-label">Total Due</span>
        <span class="summary-value summary-value--danger">&#2547;{{ totalDue() | number:'1.2-2' }}</span>
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
export class PurchaseReportComponent implements OnInit {
  private transactionStore = inject(TransactionStore);
  catalogStore = inject(CatalogStore);

  startDate = signal('');
  endDate = signal('');
  partyFilter = signal('');

  filteredPurchases = computed(() => {
    let purchases = this.transactionStore.purchases();
    const start = this.startDate()
      ? new Date(this.startDate()).setHours(0, 0, 0, 0)
      : 0;
    const end = this.endDate()
      ? new Date(this.endDate()).setHours(23, 59, 59, 999)
      : Infinity;
    const party = this.partyFilter();

    purchases = purchases.filter(
      (t) => t.transaction_date >= start && t.transaction_date <= end,
    );
    if (party) {
      purchases = purchases.filter((t) => t.party_uuid === party);
    }
    return [...purchases].sort(
      (a, b) => b.transaction_date - a.transaction_date,
    );
  });

  totalAmount = computed(() =>
    this.filteredPurchases().reduce((s, t) => s + (t.total_amount || 0), 0),
  );
  totalPaid = computed(() =>
    this.filteredPurchases().reduce((s, t) => s + (t.paid_amount || 0), 0),
  );
  totalDue = computed(() =>
    this.filteredPurchases().reduce((s, t) => s + (t.due_amount || 0), 0),
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
}
