import { Component, inject, computed, OnInit } from '@angular/core';
import { DecimalPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CatalogStore } from '../../core/stores/catalog.store';
import { TransactionStore } from '../../core/stores/transaction.store';

type DueFilter = 'all' | 'receivable' | 'payable';

@Component({
  selector: 'gonok-due-list',
  standalone: true,
  imports: [DecimalPipe, DatePipe, FormsModule],
  template: `
    <div class="page-header">
      <h1 class="page-header__title">Due List</h1>
      <div class="page-header__actions">
        <select class="form-input form-input--sm" [(ngModel)]="filter" name="filter">
          <option value="all">All Dues</option>
          <option value="receivable">Receivable Only</option>
          <option value="payable">Payable Only</option>
        </select>
        <input
          class="form-input form-input--sm"
          type="text"
          [(ngModel)]="search"
          name="search"
          placeholder="Search party..."
        />
      </div>
    </div>

    <!-- Summary Cards -->
    <div class="summary-cards">
      <div class="card card--stat">
        <div class="card__label">Total Receivable</div>
        <div class="card__value card__value--success">&#2547;{{ totalReceivable() | number:'1.2-2' }}</div>
      </div>
      <div class="card card--stat">
        <div class="card__label">Total Payable</div>
        <div class="card__value card__value--danger">&#2547;{{ totalPayable() | number:'1.2-2' }}</div>
      </div>
      <div class="card card--stat">
        <div class="card__label">Parties with Dues</div>
        <div class="card__value">{{ filteredParties().length }}</div>
      </div>
    </div>

    <!-- Due List Table -->
    <div class="table-wrapper">
      <table class="table">
        <thead>
          <tr>
            <th>Party Name</th>
            <th>Type</th>
            <th>Phone</th>
            <th class="text-right">Balance</th>
            <th>Status</th>
            <th>Last Transaction</th>
          </tr>
        </thead>
        <tbody>
          @for (item of filteredParties(); track item.uuid) {
            <tr>
              <td class="font-medium">{{ item.name }}</td>
              <td>
                <span class="badge" [class.badge--info]="item.party_type === 'customer'" [class.badge--neutral]="item.party_type === 'supplier'">
                  {{ item.party_type === 'customer' ? 'Customer' : 'Supplier' }}
                </span>
              </td>
              <td>{{ item.phone || '-' }}</td>
              <td class="col-amount" [class.text-success]="item.current_balance > 0" [class.text-danger]="item.current_balance < 0">
                &#2547;{{ abs(item.current_balance) | number:'1.2-2' }}
              </td>
              <td>
                @if (item.party_type === 'customer') {
                  <span class="badge badge--success">Receivable</span>
                } @else {
                  <span class="badge badge--danger">Payable</span>
                }
              </td>
              <td>{{ getLastTxDate(item.uuid) | date:'dd/MM/yyyy' }}</td>
            </tr>
          } @empty {
            <tr>
              <td colspan="6" class="text-center text-muted">No dues found.</td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
  styles: `
    @use '../../../styles/abstracts/variables' as *;

    .summary-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: $space-5;
      margin-bottom: $space-6;
    }
    .card__value--success { color: $color-success; }
    .card__value--danger { color: $color-danger; }
    .text-success { color: $color-success; }
    .text-danger { color: $color-danger; }
    .text-center { text-align: center; }
    .text-muted { color: $color-text-secondary; }
    .font-medium { font-weight: $font-weight-medium; }
    .page-header__actions {
      display: flex;
      gap: $space-2;
      .form-input--sm { width: 180px; }
    }
  `,
})
export class DueListComponent implements OnInit {
  private catalogStore = inject(CatalogStore);
  private transactionStore = inject(TransactionStore);

  filter: DueFilter = 'all';
  search = '';

  filteredParties = computed(() => {
    let parties = this.catalogStore.parties().filter(
      (p) => p.current_balance !== 0 && p.can_delete !== false,
    );

    if (this.filter === 'receivable') {
      parties = parties.filter((p) => p.party_type === 'customer' && p.current_balance > 0);
    } else if (this.filter === 'payable') {
      parties = parties.filter((p) => p.party_type === 'supplier' && p.current_balance > 0);
    }

    const term = this.search.toLowerCase();
    if (term) {
      parties = parties.filter(
        (p) =>
          (p.name || '').toLowerCase().includes(term) ||
          (p.phone || '').includes(term),
      );
    }

    return [...parties].sort((a, b) => (b.current_balance || 0) - (a.current_balance || 0));
  });

  totalReceivable = computed(() =>
    this.catalogStore.customers().reduce((s, p) => s + Math.max(0, p.current_balance || 0), 0),
  );

  totalPayable = computed(() =>
    this.catalogStore.suppliers().reduce((s, p) => s + Math.max(0, p.current_balance || 0), 0),
  );

  ngOnInit(): void {
    if (!this.catalogStore.initialized()) this.catalogStore.loadAll();
    if (!this.transactionStore.initialized()) this.transactionStore.loadAll();
  }

  abs(n: number): number {
    return Math.abs(n);
  }

  getLastTxDate(partyUuid: string): number | null {
    const txs = this.transactionStore.transactions().filter(
      (t) => t.party_uuid === partyUuid,
    );
    if (txs.length === 0) return null;
    return Math.max(...txs.map((t) => t.transaction_date));
  }
}
