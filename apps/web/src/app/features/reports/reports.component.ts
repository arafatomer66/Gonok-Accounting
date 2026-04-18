import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'gonok-reports',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="page-header">
      <h1 class="page-header__title">Reports</h1>
    </div>
    <div class="report-grid">
      <a class="report-card" routerLink="sales">
        <div class="report-card__icon">&#128200;</div>
        <div class="report-card__content">
          <h3 class="report-card__title">Sales Report</h3>
          <p class="report-card__desc">View all sales transactions with date and party filters</p>
        </div>
        <span class="report-card__arrow">&rarr;</span>
      </a>
      <a class="report-card" routerLink="purchase">
        <div class="report-card__icon">&#128230;</div>
        <div class="report-card__content">
          <h3 class="report-card__title">Purchase Report</h3>
          <p class="report-card__desc">View all purchase transactions with date and party filters</p>
        </div>
        <span class="report-card__arrow">&rarr;</span>
      </a>
      <a class="report-card" routerLink="daybook">
        <div class="report-card__icon">&#128214;</div>
        <div class="report-card__content">
          <h3 class="report-card__title">Day Book</h3>
          <p class="report-card__desc">All transactions in chronological order with inflow/outflow</p>
        </div>
        <span class="report-card__arrow">&rarr;</span>
      </a>
      <a class="report-card" routerLink="party-statement">
        <div class="report-card__icon">&#128101;</div>
        <div class="report-card__content">
          <h3 class="report-card__title">Party Statement</h3>
          <p class="report-card__desc">Ledger per customer/supplier with running balance</p>
        </div>
        <span class="report-card__arrow">&rarr;</span>
      </a>
      <a class="report-card" routerLink="stock-summary">
        <div class="report-card__icon">&#128229;</div>
        <div class="report-card__content">
          <h3 class="report-card__title">Stock Summary</h3>
          <p class="report-card__desc">Current stock levels, valuation, and product details</p>
        </div>
        <span class="report-card__arrow">&rarr;</span>
      </a>
    </div>
  `,
  styles: `
    @use '../../../styles/abstracts/variables' as *;

    .report-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: $space-4;
    }

    .report-card {
      display: flex;
      align-items: center;
      gap: $space-4;
      padding: $space-5;
      background: white;
      border: 1px solid $color-border;
      border-radius: $radius-lg;
      text-decoration: none;
      color: inherit;
      transition: box-shadow $transition-base, border-color $transition-base;
      cursor: pointer;

      &:hover {
        border-color: $color-primary;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
      }
    }

    .report-card__icon {
      font-size: 2rem;
      flex-shrink: 0;
    }

    .report-card__content {
      flex: 1;
    }

    .report-card__title {
      font-size: $font-size-lg;
      font-weight: $font-weight-semibold;
      margin: 0 0 $space-1 0;
    }

    .report-card__desc {
      font-size: $font-size-sm;
      color: $color-text-secondary;
      margin: 0;
    }

    .report-card__arrow {
      font-size: $font-size-xl;
      color: $color-text-secondary;
      flex-shrink: 0;
    }
  `,
})
export class ReportsComponent {}
