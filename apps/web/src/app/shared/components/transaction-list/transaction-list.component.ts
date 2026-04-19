import { Component, inject, input, output, computed } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { SearchInputComponent } from '../search-input/search-input.component';
import { ITransaction } from '@org/shared-types';
import { CatalogStore } from '../../../core/stores/catalog.store';
import { signal } from '@angular/core';

@Component({
  selector: 'gonok-transaction-list',
  standalone: true,
  imports: [DatePipe, DecimalPipe, SearchInputComponent],
  template: `
    <gonok-search-input
      placeholder="Search by invoice no, party name..."
      (searchChange)="searchTerm.set($event)"
    />

    <div class="table-wrapper">
      <table class="table">
        <thead>
          <tr>
            <th>Date</th>
            <th>{{ invoiceLabel() }}</th>
            <th>{{ partyLabel() }}</th>
            <th>Mode</th>
            <th class="text-right">Amount</th>
            @if (!hidedue()) {
              <th class="text-right">Due</th>
            }
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          @for (tx of filtered(); track tx.uuid) {
            <tr>
              <td>{{ tx.transaction_date | date:'dd/MM/yyyy' }}</td>
              <td>{{ tx.invoice_no || tx.order_number || '-' }}</td>
              <td>{{ getPartyName(tx.party_uuid) }}</td>
              <td>
                <span class="badge"
                  [class.badge--success]="tx.transaction_mode === 'Cash'"
                  [class.badge--warning]="tx.transaction_mode === 'Credit'"
                >{{ tx.transaction_mode || '-' }}</span>
              </td>
              <td class="col-amount">&#2547;{{ tx.total_amount | number:'1.2-2' }}</td>
              @if (!hidedue()) {
                <td class="col-amount" [class.text-danger]="tx.due_amount > 0">
                  &#2547;{{ tx.due_amount | number:'1.2-2' }}
                </td>
              }
              <td>
                <div class="action-btns">
                  <button class="btn btn--sm btn--ghost" (click)="printTx.emit(tx)" title="Print">🖨️</button>
                  <button class="btn btn--sm btn--ghost" (click)="edit.emit(tx)">Edit</button>
                  <button class="btn btn--sm btn--ghost btn--danger-text" (click)="delete.emit(tx)">Delete</button>
                </div>
              </td>
            </tr>
          } @empty {
            <tr>
              <td [attr.colspan]="hidedue() ? 6 : 7" class="text-center text-muted">
                {{ emptyMessage() }}
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>

    <div class="summary-bar">
      Total: {{ transactions().length }} &middot;
      Amount: &#2547;{{ totalAmount() | number:'1.2-2' }}
      @if (!hidedue()) {
        &middot; Due: &#2547;{{ totalDue() | number:'1.2-2' }}
      }
    </div>
  `,
  styles: `
    @use '../../../../styles/abstracts/variables' as *;

    .action-btns {
      display: flex;
      gap: $space-1;
    }
    .btn--danger-text {
      color: $color-danger;
      &:hover { background: rgba($color-danger, 0.08); }
    }
    .text-center { text-align: center; }
    .text-muted { color: $color-text-secondary; }
    .text-danger { color: $color-danger; }
    .summary-bar {
      margin-top: $space-4;
      padding: $space-3 $space-4;
      background: $color-gray-50;
      border-radius: $radius-md;
      font-size: $font-size-sm;
      color: $color-text-secondary;
    }
  `,
})
export class TransactionListComponent {
  private catalogStore = inject(CatalogStore);

  transactions = input.required<ITransaction[]>();
  partyLabel = input<string>('Party');
  invoiceLabel = input<string>('Invoice No');
  emptyMessage = input<string>('No transactions found.');
  hidedue = input<boolean>(false);

  edit = output<ITransaction>();
  delete = output<ITransaction>();
  printTx = output<ITransaction>();

  searchTerm = signal('');

  filtered = computed(() => {
    const term = this.searchTerm().toLowerCase();
    let txs = this.transactions();
    if (term) {
      txs = txs.filter(
        (tx) =>
          (tx.invoice_no || '').toLowerCase().includes(term) ||
          (tx.order_number || '').toLowerCase().includes(term) ||
          this.getPartyName(tx.party_uuid).toLowerCase().includes(term),
      );
    }
    return [...txs].sort((a, b) => b.transaction_date - a.transaction_date);
  });

  totalAmount = computed(() =>
    this.transactions().reduce((s, t) => s + (t.total_amount || 0), 0),
  );

  totalDue = computed(() =>
    this.transactions().reduce((s, t) => s + (t.due_amount || 0), 0),
  );

  getPartyName(uuid: string | null): string {
    if (!uuid) return '-';
    const party = this.catalogStore.allParties().find((p) => p.uuid === uuid);
    return party?.name || '-';
  }
}
