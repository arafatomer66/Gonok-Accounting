import { Component, inject, computed, signal, OnInit } from '@angular/core';
import { DecimalPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TransactionStore } from '../../../core/stores/transaction.store';
import { CatalogStore } from '../../../core/stores/catalog.store';
import { ETransactionType, EPartyType } from '@org/shared-types';

@Component({
  selector: 'gonok-party-statement',
  standalone: true,
  imports: [DecimalPipe, DatePipe, FormsModule, RouterLink],
  template: `
    <div class="page-header">
      <a routerLink="../" class="btn btn--ghost btn--sm">&larr; Reports</a>
      <h1 class="page-header__title">Party Statement</h1>
    </div>

    <div class="filter-bar">
      <div class="form-group form-group--wide">
        <label class="form-label">Party</label>
        <select class="form-input" [(ngModel)]="selectedPartyUuid">
          <option value="">Select a party...</option>
          @for (party of catalogStore.allParties(); track party.uuid) {
            <option [value]="party.uuid">{{ party.name }} ({{ party.party_type === 'customer' ? 'Customer' : 'Supplier' }})</option>
          }
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">From Date</label>
        <input type="date" class="form-input" [(ngModel)]="startDate" />
      </div>
      <div class="form-group">
        <label class="form-label">To Date</label>
        <input type="date" class="form-input" [(ngModel)]="endDate" />
      </div>
    </div>

    @if (selectedParty()) {
      <div class="party-info">
        <div class="party-info__name">{{ selectedParty()!.name }}</div>
        <span class="badge" [class.badge--success]="selectedParty()!.party_type === 'customer'" [class.badge--info]="selectedParty()!.party_type === 'supplier'">
          {{ selectedParty()!.party_type === 'customer' ? 'Customer' : 'Supplier' }}
        </span>
        @if (selectedParty()!.phone) {
          <span class="party-info__phone">{{ selectedParty()!.phone }}</span>
        }
        <div class="party-info__balance">
          Balance: <strong>&#2547;{{ selectedParty()!.current_balance | number:'1.2-2' }}</strong>
        </div>
      </div>
    }

    @if (selectedPartyUuid()) {
      <div class="table-wrapper">
        <table class="table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Reference</th>
              <th class="col-amount">Debit</th>
              <th class="col-amount">Credit</th>
              <th class="col-amount">Balance</th>
            </tr>
          </thead>
          <tbody>
            @for (row of statementRows(); track row.uuid) {
              <tr>
                <td>{{ row.date | date:'dd/MM/yyyy' }}</td>
                <td>
                  <span class="badge"
                    [class.badge--success]="row.type === 'sales' || row.type === 'payment_in'"
                    [class.badge--warning]="row.type === 'purchase' || row.type === 'payment_out'"
                    [class.badge--info]="row.type === 'sales_return' || row.type === 'purchase_return'"
                  >{{ formatType(row.type) }}</span>
                </td>
                <td>{{ row.ref || '-' }}</td>
                <td class="col-amount">
                  @if (row.debit > 0) {
                    &#2547;{{ row.debit | number:'1.2-2' }}
                  }
                </td>
                <td class="col-amount">
                  @if (row.credit > 0) {
                    &#2547;{{ row.credit | number:'1.2-2' }}
                  }
                </td>
                <td class="col-amount">&#2547;{{ row.balance | number:'1.2-2' }}</td>
              </tr>
            } @empty {
              <tr>
                <td colspan="6" class="text-center text-muted">No transactions found for this party.</td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      <div class="summary-bar">
        <div class="summary-item">
          <span class="summary-label">Transactions</span>
          <span class="summary-value">{{ statementRows().length }}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Total Debit</span>
          <span class="summary-value">&#2547;{{ totalDebit() | number:'1.2-2' }}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Total Credit</span>
          <span class="summary-value">&#2547;{{ totalCredit() | number:'1.2-2' }}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Closing Balance</span>
          <span class="summary-value" [class.summary-value--success]="closingBalance() <= 0" [class.summary-value--danger]="closingBalance() > 0">
            &#2547;{{ closingBalance() | number:'1.2-2' }}
          </span>
        </div>
      </div>
    } @else {
      <div class="empty-state">
        <p class="text-muted">Select a party to view their statement.</p>
      </div>
    }
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

      .form-group--wide {
        max-width: 350px;
      }
    }

    .party-info {
      display: flex;
      align-items: center;
      gap: $space-3;
      padding: $space-3 $space-4;
      background: $color-gray-50;
      border-radius: $radius-md;
      margin-bottom: $space-4;
      flex-wrap: wrap;
    }

    .party-info__name {
      font-weight: $font-weight-semibold;
      font-size: $font-size-lg;
    }

    .party-info__phone {
      color: $color-text-secondary;
      font-size: $font-size-sm;
    }

    .party-info__balance {
      margin-left: auto;
      font-size: $font-size-base;
    }

    .empty-state {
      text-align: center;
      padding: $space-10;
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
export class PartyStatementComponent implements OnInit {
  private transactionStore = inject(TransactionStore);
  catalogStore = inject(CatalogStore);

  selectedPartyUuid = signal('');
  startDate = signal('');
  endDate = signal('');

  selectedParty = computed(() => {
    const uuid = this.selectedPartyUuid();
    if (!uuid) return null;
    return this.catalogStore.allParties().find((p) => p.uuid === uuid) || null;
  });

  statementRows = computed(() => {
    const party = this.selectedParty();
    if (!party) return [];

    const start = this.startDate()
      ? new Date(this.startDate()).setHours(0, 0, 0, 0)
      : 0;
    const end = this.endDate()
      ? new Date(this.endDate()).setHours(23, 59, 59, 999)
      : Infinity;

    const txs = this.transactionStore
      .transactions()
      .filter(
        (t) =>
          t.party_uuid === party.uuid &&
          t.transaction_date >= start &&
          t.transaction_date <= end,
      )
      .sort((a, b) => a.transaction_date - b.transaction_date);

    const isCustomer = party.party_type === EPartyType.CUSTOMER;
    let runningBalance = 0;

    return txs.map((tx) => {
      const type = tx.type as ETransactionType;
      let debit = 0;
      let credit = 0;

      if (isCustomer) {
        if (
          type === ETransactionType.SALES ||
          type === ETransactionType.PURCHASE_RETURN
        ) {
          debit = tx.total_amount || 0;
        } else if (type === ETransactionType.PAYMENT_IN) {
          credit = tx.paid_amount || 0;
        } else if (
          type === ETransactionType.SALES_RETURN ||
          type === ETransactionType.PURCHASE
        ) {
          credit = tx.total_amount || 0;
        } else if (type === ETransactionType.PAYMENT_OUT) {
          debit = tx.paid_amount || 0;
        }
      } else {
        // Supplier
        if (
          type === ETransactionType.PURCHASE ||
          type === ETransactionType.SALES_RETURN
        ) {
          debit = tx.total_amount || 0;
        } else if (type === ETransactionType.PAYMENT_OUT) {
          credit = tx.paid_amount || 0;
        } else if (
          type === ETransactionType.PURCHASE_RETURN ||
          type === ETransactionType.SALES
        ) {
          credit = tx.total_amount || 0;
        } else if (type === ETransactionType.PAYMENT_IN) {
          debit = tx.paid_amount || 0;
        }
      }

      runningBalance += debit - credit;

      return {
        uuid: tx.uuid,
        date: tx.transaction_date,
        type: tx.type,
        ref: tx.invoice_no || tx.order_number || tx.bill_no,
        debit,
        credit,
        balance: runningBalance,
      };
    });
  });

  totalDebit = computed(() =>
    this.statementRows().reduce((s, r) => s + r.debit, 0),
  );
  totalCredit = computed(() =>
    this.statementRows().reduce((s, r) => s + r.credit, 0),
  );
  closingBalance = computed(() => {
    const rows = this.statementRows();
    return rows.length > 0 ? rows[rows.length - 1].balance : 0;
  });

  ngOnInit(): void {
    if (!this.transactionStore.initialized()) this.transactionStore.loadAll();
    if (!this.catalogStore.initialized()) this.catalogStore.loadAll();
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
