import { Component, inject, input, output, computed, OnInit } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { SearchInputComponent } from '../search-input/search-input.component';
import { ITransaction, ITransactionItem, ETables } from '@org/shared-types';
import { CatalogStore } from '../../../core/stores/catalog.store';
import { AuthStore } from '../../../core/stores/auth.store';
import { PouchDbService } from '../../../core/services/pouchdb.service';
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
            @if (showProfit()) {
              <th class="text-right">Profit</th>
            }
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
              @if (showProfit()) {
                <td class="col-amount" [class.text-profit]="getProfit(tx.uuid) > 0" [class.text-danger]="getProfit(tx.uuid) < 0">
                  &#2547;{{ getProfit(tx.uuid) | number:'1.2-2' }}
                </td>
              }
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
              <td [attr.colspan]="colSpan()" class="text-center text-muted">
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
      @if (showProfit()) {
        &middot; Profit: <span [class.text-profit]="totalProfit() > 0" [class.text-danger]="totalProfit() < 0">&#2547;{{ totalProfit() | number:'1.2-2' }}</span>
      }
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
    .text-profit { color: $color-success; font-weight: $font-weight-medium; }
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
export class TransactionListComponent implements OnInit {
  private catalogStore = inject(CatalogStore);
  private authStore = inject(AuthStore);
  private pouchDb = inject(PouchDbService);

  transactions = input.required<ITransaction[]>();
  partyLabel = input<string>('Party');
  invoiceLabel = input<string>('Invoice No');
  emptyMessage = input<string>('No transactions found.');
  hidedue = input<boolean>(false);
  showProfit = input<boolean>(false);

  edit = output<ITransaction>();
  delete = output<ITransaction>();
  printTx = output<ITransaction>();

  searchTerm = signal('');
  profitMap = signal<Record<string, number>>({});

  colSpan = computed(() => {
    let cols = 6;
    if (!this.hidedue()) cols++;
    if (this.showProfit()) cols++;
    return cols;
  });

  totalProfit = computed(() => {
    const map = this.profitMap();
    return this.transactions().reduce((s, t) => s + (map[t.uuid] || 0), 0);
  });

  async ngOnInit(): Promise<void> {
    if (this.showProfit()) {
      await this.loadProfitData();
    }
  }

  private async loadProfitData(): Promise<void> {
    const bizUuid = this.authStore.activeBusinessUuid();
    if (!bizUuid) return;

    const allItems = await this.pouchDb.findByBusiness<ITransactionItem>(ETables.TRANSACTION_ITEM, bizUuid);
    const map: Record<string, number> = {};

    for (const item of allItems) {
      if (!item.transaction_uuid) continue;
      const profit = (item.sales_price - item.purchase_price) * item.quantity;
      map[item.transaction_uuid] = (map[item.transaction_uuid] || 0) + profit;
    }

    this.profitMap.set(map);
  }

  getProfit(txUuid: string): number {
    return this.profitMap()[txUuid] || 0;
  }

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
