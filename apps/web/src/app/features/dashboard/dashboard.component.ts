import { Component, inject, computed, OnInit, AfterViewInit, ViewChild, ElementRef, effect } from '@angular/core';
import { DecimalPipe, DatePipe } from '@angular/common';
import { TransactionStore } from '../../core/stores/transaction.store';
import { CatalogStore } from '../../core/stores/catalog.store';
import { ExpenseStore } from '../../core/stores/expense.store';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

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

    <!-- Charts Row -->
    <div class="chart-row mt-4">
      <div class="card chart-card">
        <div class="card__header">
          <h3 class="card__title">Monthly Sales vs Purchase</h3>
        </div>
        <div class="card__body chart-body">
          <canvas #salesChart></canvas>
        </div>
      </div>
      <div class="card chart-card">
        <div class="card__header">
          <h3 class="card__title">Revenue Breakdown</h3>
        </div>
        <div class="card__body chart-body chart-body--donut">
          <canvas #revenueChart></canvas>
        </div>
      </div>
    </div>

    <!-- Top Products & Recent Transactions -->
    <div class="chart-row mt-4">
      <div class="card chart-card">
        <div class="card__header">
          <h3 class="card__title">Top 5 Products (by Sales Qty)</h3>
        </div>
        <div class="card__body chart-body">
          <canvas #topProductsChart></canvas>
        </div>
      </div>
      <div class="card chart-card">
        <div class="card__header">
          <h3 class="card__title">Recent Transactions</h3>
        </div>
        <div class="card__body">
          @if (recentTransactions().length === 0) {
            <p class="text-muted">No transactions yet.</p>
          } @else {
            <div class="table-wrapper">
              <table class="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th class="text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  @for (tx of recentTransactions(); track tx.uuid) {
                    <tr>
                      <td>{{ tx.transaction_date | date:'dd/MM' }}</td>
                      <td>
                        <span class="badge"
                          [class.badge--success]="tx.type === 'sales' || tx.type === 'payment_in'"
                          [class.badge--warning]="tx.type === 'purchase' || tx.type === 'payment_out'"
                          [class.badge--info]="tx.type === 'sales_return' || tx.type === 'purchase_return'"
                        >{{ formatType(tx.type) }}</span>
                      </td>
                      <td class="col-amount">&#2547;{{ tx.total_amount | number:'1.0-0' }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </div>
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
    .chart-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: $space-5;
      @media (max-width: 768px) { grid-template-columns: 1fr; }
    }
    .chart-card {
      min-height: 320px;
    }
    .chart-body {
      position: relative;
      height: 260px;
    }
    .chart-body--donut {
      display: flex;
      align-items: center;
      justify-content: center;
      max-width: 280px;
      margin: 0 auto;
    }
    .mt-4 { margin-top: $space-6; }
    .text-muted { color: $color-text-secondary; }
    .card__value--success { color: $color-success; }
    .card__value--danger { color: $color-danger; }
  `,
})
export class DashboardComponent implements OnInit, AfterViewInit {
  private transactionStore = inject(TransactionStore);
  catalogStore = inject(CatalogStore);
  expenseStore = inject(ExpenseStore);

  @ViewChild('salesChart') salesChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('revenueChart') revenueChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('topProductsChart') topProductsChartRef!: ElementRef<HTMLCanvasElement>;

  private salesChartInstance: Chart | null = null;
  private revenueChartInstance: Chart | null = null;
  private topProductsChartInstance: Chart | null = null;
  private chartsReady = false;

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
      .slice(0, 8),
  );

  monthlyData = computed(() => {
    const now = new Date();
    const months: { label: string; sales: number; purchase: number }[] = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const start = d.getTime();
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999).getTime();
      const label = d.toLocaleString('default', { month: 'short' });

      const sales = this.transactionStore.sales()
        .filter((t) => t.transaction_date >= start && t.transaction_date <= end)
        .reduce((s, t) => s + (t.total_amount || 0), 0);

      const purchase = this.transactionStore.purchases()
        .filter((t) => t.transaction_date >= start && t.transaction_date <= end)
        .reduce((s, t) => s + (t.total_amount || 0), 0);

      months.push({ label, sales, purchase });
    }
    return months;
  });

  topProducts = computed(() => {
    const qtyMap = new Map<string, { name: string; qty: number }>();
    for (const tx of this.transactionStore.sales()) {
      for (const item of tx.items || []) {
        if (!item.item_uuid) continue;
        const existing = qtyMap.get(item.item_uuid);
        if (existing) {
          existing.qty += item.quantity || 0;
        } else {
          const product = this.catalogStore.products().find((p) => p.uuid === item.item_uuid);
          qtyMap.set(item.item_uuid, { name: product?.name || 'Unknown', qty: item.quantity || 0 });
        }
      }
    }
    return [...qtyMap.values()].sort((a, b) => b.qty - a.qty).slice(0, 5);
  });

  constructor() {
    effect(() => {
      // Re-render charts when data changes
      this.monthlyData();
      this.topProducts();
      this.totalSales();
      if (this.chartsReady) {
        this.renderCharts();
      }
    });
  }

  ngOnInit(): void {
    if (!this.catalogStore.initialized()) this.catalogStore.loadAll();
    if (!this.transactionStore.initialized()) this.transactionStore.loadAll();
    if (!this.expenseStore.initialized()) this.expenseStore.loadAll();
  }

  ngAfterViewInit(): void {
    this.chartsReady = true;
    // Small delay to let signals settle
    setTimeout(() => this.renderCharts(), 300);
  }

  private renderCharts(): void {
    this.renderSalesChart();
    this.renderRevenueChart();
    this.renderTopProductsChart();
  }

  private renderSalesChart(): void {
    if (!this.salesChartRef) return;
    this.salesChartInstance?.destroy();

    const data = this.monthlyData();
    this.salesChartInstance = new Chart(this.salesChartRef.nativeElement, {
      type: 'bar',
      data: {
        labels: data.map((d) => d.label),
        datasets: [
          {
            label: 'Sales',
            data: data.map((d) => d.sales),
            backgroundColor: 'rgba(79, 70, 229, 0.8)',
            borderRadius: 6,
          },
          {
            label: 'Purchase',
            data: data.map((d) => d.purchase),
            backgroundColor: 'rgba(245, 158, 11, 0.8)',
            borderRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { padding: 16, usePointStyle: true } },
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(0,0,0,0.04)' },
            ticks: { callback: (v) => '৳' + Number(v).toLocaleString() },
          },
          x: { grid: { display: false } },
        },
      },
    });
  }

  private renderRevenueChart(): void {
    if (!this.revenueChartRef) return;
    this.revenueChartInstance?.destroy();

    const sales = this.totalSales();
    const purchase = this.totalPurchase();
    const expenses = this.expenseStore.totalExpenses();

    this.revenueChartInstance = new Chart(this.revenueChartRef.nativeElement, {
      type: 'doughnut',
      data: {
        labels: ['Sales', 'Purchase', 'Expenses'],
        datasets: [{
          data: [sales, purchase, expenses],
          backgroundColor: [
            'rgba(79, 70, 229, 0.85)',
            'rgba(245, 158, 11, 0.85)',
            'rgba(239, 68, 68, 0.85)',
          ],
          borderWidth: 0,
          spacing: 2,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%',
        plugins: {
          legend: { position: 'bottom', labels: { padding: 16, usePointStyle: true } },
        },
      },
    });
  }

  private renderTopProductsChart(): void {
    if (!this.topProductsChartRef) return;
    this.topProductsChartInstance?.destroy();

    const data = this.topProducts();
    if (data.length === 0) return;

    this.topProductsChartInstance = new Chart(this.topProductsChartRef.nativeElement, {
      type: 'bar',
      data: {
        labels: data.map((d) => d.name.length > 15 ? d.name.slice(0, 15) + '...' : d.name),
        datasets: [{
          label: 'Qty Sold',
          data: data.map((d) => d.qty),
          backgroundColor: 'rgba(16, 185, 129, 0.8)',
          borderRadius: 6,
        }],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
        },
        scales: {
          x: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.04)' } },
          y: { grid: { display: false } },
        },
      },
    });
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
