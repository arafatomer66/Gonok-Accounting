import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TransactionStore } from '../../../core/stores/transaction.store';
import { CatalogStore } from '../../../core/stores/catalog.store';
import { EPartyType } from '@org/shared-types';

interface AgingRow {
  partyName: string;
  partyUuid: string;
  current: number;
  bucket1: number; // 1-30
  bucket2: number; // 31-60
  bucket3: number; // 61-90
  bucket4: number; // 90+
  total: number;
}

@Component({
  selector: 'gonok-aging-report',
  standalone: true,
  imports: [DecimalPipe, RouterLink],
  template: `
    <div class="page-header">
      <h1 class="page-header__title">Aging Report</h1>
      <a class="btn btn--ghost btn--sm" routerLink="/reports">Back to Reports</a>
    </div>

    <div class="filter-bar">
      <button
        class="btn btn--sm"
        [class.btn--primary]="tab() === 'receivable'"
        [class.btn--ghost]="tab() !== 'receivable'"
        (click)="tab.set('receivable')"
      >Receivable</button>
      <button
        class="btn btn--sm"
        [class.btn--primary]="tab() === 'payable'"
        [class.btn--ghost]="tab() !== 'payable'"
        (click)="tab.set('payable')"
      >Payable</button>
    </div>

    <div class="table-wrapper">
      <table class="table">
        <thead>
          <tr>
            <th>Party</th>
            <th class="text-right">Current</th>
            <th class="text-right">1-30 days</th>
            <th class="text-right">31-60 days</th>
            <th class="text-right">61-90 days</th>
            <th class="text-right">90+ days</th>
            <th class="text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          @for (row of rows(); track row.partyUuid) {
            <tr>
              <td>{{ row.partyName }}</td>
              <td class="col-amount">&#2547;{{ row.current | number:'1.2-2' }}</td>
              <td class="col-amount">&#2547;{{ row.bucket1 | number:'1.2-2' }}</td>
              <td class="col-amount">&#2547;{{ row.bucket2 | number:'1.2-2' }}</td>
              <td class="col-amount">&#2547;{{ row.bucket3 | number:'1.2-2' }}</td>
              <td class="col-amount" [class.text-danger]="row.bucket4 > 0">&#2547;{{ row.bucket4 | number:'1.2-2' }}</td>
              <td class="col-amount col-amount--bold">&#2547;{{ row.total | number:'1.2-2' }}</td>
            </tr>
          } @empty {
            <tr>
              <td colspan="7" class="text-center text-muted">No outstanding dues found.</td>
            </tr>
          }
        </tbody>
        @if (rows().length > 0) {
          <tfoot>
            <tr class="total-row">
              <td><strong>Total</strong></td>
              <td class="col-amount"><strong>&#2547;{{ totals().current | number:'1.2-2' }}</strong></td>
              <td class="col-amount"><strong>&#2547;{{ totals().bucket1 | number:'1.2-2' }}</strong></td>
              <td class="col-amount"><strong>&#2547;{{ totals().bucket2 | number:'1.2-2' }}</strong></td>
              <td class="col-amount"><strong>&#2547;{{ totals().bucket3 | number:'1.2-2' }}</strong></td>
              <td class="col-amount"><strong>&#2547;{{ totals().bucket4 | number:'1.2-2' }}</strong></td>
              <td class="col-amount"><strong>&#2547;{{ totals().total | number:'1.2-2' }}</strong></td>
            </tr>
          </tfoot>
        }
      </table>
    </div>
  `,
  styles: `
    @use '../../../../styles/abstracts/variables' as *;

    .filter-bar {
      display: flex;
      gap: $space-2;
      margin-bottom: $space-4;
    }
    .text-center { text-align: center; }
    .text-muted { color: $color-text-secondary; }
    .text-danger { color: $color-danger; }
    .col-amount--bold { font-weight: $font-weight-semibold; }
    .total-row {
      background: $color-gray-50;
      td { border-top: 2px solid $color-border; }
    }
  `,
})
export class AgingReportComponent implements OnInit {
  private transactionStore = inject(TransactionStore);
  private catalogStore = inject(CatalogStore);

  tab = signal<'receivable' | 'payable'>('receivable');

  rows = computed<AgingRow[]>(() => {
    const now = Date.now();
    const DAY = 86400000;
    const isReceivable = this.tab() === 'receivable';
    const partyType = isReceivable ? EPartyType.CUSTOMER : EPartyType.SUPPLIER;

    const transactions = this.transactionStore.transactions()
      .filter((t) => t.due_amount > 0 && t.due_date > 0);

    const partyMap = new Map<string, AgingRow>();

    for (const tx of transactions) {
      if (!tx.party_uuid) continue;

      const party = this.catalogStore.parties().find((p) => p.uuid === tx.party_uuid);
      if (!party || party.party_type !== partyType) continue;

      if (!partyMap.has(tx.party_uuid)) {
        partyMap.set(tx.party_uuid, {
          partyName: party.name || 'Unknown',
          partyUuid: tx.party_uuid,
          current: 0,
          bucket1: 0,
          bucket2: 0,
          bucket3: 0,
          bucket4: 0,
          total: 0,
        });
      }

      const row = partyMap.get(tx.party_uuid)!;
      const daysOverdue = Math.floor((now - tx.due_date) / DAY);

      if (daysOverdue <= 0) {
        row.current += tx.due_amount;
      } else if (daysOverdue <= 30) {
        row.bucket1 += tx.due_amount;
      } else if (daysOverdue <= 60) {
        row.bucket2 += tx.due_amount;
      } else if (daysOverdue <= 90) {
        row.bucket3 += tx.due_amount;
      } else {
        row.bucket4 += tx.due_amount;
      }
      row.total += tx.due_amount;
    }

    return [...partyMap.values()].sort((a, b) => b.total - a.total);
  });

  totals = computed(() => {
    const r = this.rows();
    return {
      current: r.reduce((s, row) => s + row.current, 0),
      bucket1: r.reduce((s, row) => s + row.bucket1, 0),
      bucket2: r.reduce((s, row) => s + row.bucket2, 0),
      bucket3: r.reduce((s, row) => s + row.bucket3, 0),
      bucket4: r.reduce((s, row) => s + row.bucket4, 0),
      total: r.reduce((s, row) => s + row.total, 0),
    };
  });

  ngOnInit(): void {
    if (!this.transactionStore.initialized()) this.transactionStore.loadAll();
    if (!this.catalogStore.initialized()) this.catalogStore.loadAll();
  }
}
