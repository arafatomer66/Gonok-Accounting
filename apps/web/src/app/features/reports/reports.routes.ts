import { Route } from '@angular/router';

export const REPORT_ROUTES: Route[] = [
  {
    path: '',
    loadComponent: () =>
      import('./reports.component').then((m) => m.ReportsComponent),
  },
  {
    path: 'sales',
    loadComponent: () =>
      import('./sales-report/sales-report.component').then(
        (m) => m.SalesReportComponent,
      ),
  },
  {
    path: 'purchase',
    loadComponent: () =>
      import('./purchase-report/purchase-report.component').then(
        (m) => m.PurchaseReportComponent,
      ),
  },
  {
    path: 'daybook',
    loadComponent: () =>
      import('./daybook/daybook.component').then((m) => m.DaybookComponent),
  },
  {
    path: 'party-statement',
    loadComponent: () =>
      import('./party-statement/party-statement.component').then(
        (m) => m.PartyStatementComponent,
      ),
  },
  {
    path: 'stock-summary',
    loadComponent: () =>
      import('./stock-summary/stock-summary.component').then(
        (m) => m.StockSummaryComponent,
      ),
  },
  {
    path: 'aging',
    loadComponent: () =>
      import('./aging-report/aging-report.component').then(
        (m) => m.AgingReportComponent,
      ),
  },
];
