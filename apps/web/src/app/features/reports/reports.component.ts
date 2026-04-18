import { Component } from '@angular/core';

@Component({
  selector: 'gonok-reports',
  standalone: true,
  template: `
    <div class="page-header">
      <h1 class="page-header__title">Reports</h1>
    </div>
    <div class="dashboard-grid">
      <div class="card">
        <div class="card__header"><h3 class="card__title">Transaction Reports</h3></div>
        <div class="card__body">
          <p class="text-muted">Sales Report, Purchase Report, All Transactions, Day Book</p>
        </div>
      </div>
      <div class="card">
        <div class="card__header"><h3 class="card__title">Stock Reports</h3></div>
        <div class="card__body">
          <p class="text-muted">Stock Summary, Item Details</p>
        </div>
      </div>
      <div class="card">
        <div class="card__header"><h3 class="card__title">Party Reports</h3></div>
        <div class="card__body">
          <p class="text-muted">All Parties, Party Statement, Profit Loss by Party</p>
        </div>
      </div>
      <div class="card">
        <div class="card__header"><h3 class="card__title">Financial Reports</h3></div>
        <div class="card__body">
          <p class="text-muted">Profit & Loss, Cash Flow, Balance Sheet</p>
        </div>
      </div>
    </div>
  `,
  styles: `
    .dashboard-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 1rem;
    }
  `,
})
export class ReportsComponent {}
