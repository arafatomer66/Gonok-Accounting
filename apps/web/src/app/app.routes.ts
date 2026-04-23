import { Route } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { businessGuard } from './core/guards/business.guard';

export const appRoutes: Route[] = [
  // Public routes
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login.component').then(
        (m) => m.LoginComponent,
      ),
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./features/auth/register/register.component').then(
        (m) => m.RegisterComponent,
      ),
  },

  // Create business (auth required, no business required)
  {
    path: 'create-business',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/business/create-business.component').then(
        (m) => m.CreateBusinessComponent,
      ),
  },

  // Protected routes (inside shell — requires auth + at least one business)
  {
    path: '',
    loadComponent: () =>
      import('./layouts/shell/shell.component').then((m) => m.ShellComponent),
    canActivate: [authGuard, businessGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then(
            (m) => m.DashboardComponent,
          ),
      },
      {
        path: 'pos',
        loadComponent: () =>
          import('./features/pos/pos.component').then(
            (m) => m.PosComponent,
          ),
      },
      {
        path: 'products',
        loadComponent: () =>
          import('./features/products/products.component').then(
            (m) => m.ProductsComponent,
          ),
      },
      {
        path: 'parties',
        loadComponent: () =>
          import('./features/parties/parties.component').then(
            (m) => m.PartiesComponent,
          ),
      },
      {
        path: 'sales',
        loadComponent: () =>
          import('./features/transactions/sales/sales.component').then(
            (m) => m.SalesComponent,
          ),
      },
      {
        path: 'purchase',
        loadComponent: () =>
          import('./features/transactions/purchase/purchase.component').then(
            (m) => m.PurchaseComponent,
          ),
      },
      {
        path: 'payment-in',
        loadComponent: () =>
          import(
            './features/transactions/payment-in/payment-in.component'
          ).then((m) => m.PaymentInComponent),
      },
      {
        path: 'payment-out',
        loadComponent: () =>
          import(
            './features/transactions/payment-out/payment-out.component'
          ).then((m) => m.PaymentOutComponent),
      },
      {
        path: 'sales-return',
        loadComponent: () =>
          import(
            './features/transactions/sales-return/sales-return.component'
          ).then((m) => m.SalesReturnComponent),
      },
      {
        path: 'purchase-return',
        loadComponent: () =>
          import(
            './features/transactions/purchase-return/purchase-return.component'
          ).then((m) => m.PurchaseReturnComponent),
      },
      {
        path: 'expenses',
        loadComponent: () =>
          import('./features/expenses/expenses.component').then(
            (m) => m.ExpensesComponent,
          ),
      },
      {
        path: 'due-list',
        loadComponent: () =>
          import('./features/due-list/due-list.component').then(
            (m) => m.DueListComponent,
          ),
      },
      {
        path: 'cash-adjustment',
        loadComponent: () =>
          import('./features/cash-adjustment/cash-adjustment.component').then(
            (m) => m.CashAdjustmentComponent,
          ),
      },
      {
        path: 'bank',
        loadComponent: () =>
          import('./features/bank/bank.component').then(
            (m) => m.BankComponent,
          ),
      },
      {
        path: 'reports',
        loadChildren: () =>
          import('./features/reports/reports.routes').then(
            (m) => m.REPORT_ROUTES,
          ),
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('./features/settings/settings.component').then(
            (m) => m.SettingsComponent,
          ),
      },
      {
        path: 'users',
        loadComponent: () =>
          import('./features/users/users.component').then(
            (m) => m.UsersComponent,
          ),
      },
      {
        path: 'businesses',
        loadComponent: () =>
          import('./features/business/business-list.component').then(
            (m) => m.BusinessListComponent,
          ),
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./features/profile/profile.component').then(
            (m) => m.ProfileComponent,
          ),
      },
      {
        path: 'activity-log',
        loadComponent: () =>
          import('./features/activity-log/activity-log.component').then(
            (m) => m.ActivityLogComponent,
          ),
      },
      {
        path: 'backup',
        loadComponent: () =>
          import('./features/backup/backup.component').then(
            (m) => m.BackupComponent,
          ),
      },
      {
        path: 'import',
        loadComponent: () =>
          import('./features/import/import.component').then(
            (m) => m.ImportComponent,
          ),
      },
      {
        path: 'branches',
        loadComponent: () =>
          import('./features/branches/branches.component').then(
            (m) => m.BranchesComponent,
          ),
      },
      {
        path: 'quotations',
        loadComponent: () =>
          import('./features/quotations/quotations.component').then(
            (m) => m.QuotationsComponent,
          ),
      },
      {
        path: 'recurring-expenses',
        loadComponent: () =>
          import(
            './features/recurring-expenses/recurring-expenses.component'
          ).then((m) => m.RecurringExpensesComponent),
      },
      {
        path: 'payroll',
        loadComponent: () =>
          import('./features/payroll/payroll.component').then(
            (m) => m.PayrollComponent,
          ),
      },
      {
        path: 'deliveries',
        loadComponent: () =>
          import('./features/deliveries/deliveries.component').then(
            (m) => m.DeliveriesComponent,
          ),
      },
      {
        path: 'purchase-orders',
        loadComponent: () =>
          import('./features/purchase-orders/purchase-orders.component').then(
            (m) => m.PurchaseOrdersComponent,
          ),
      },
      {
        path: 'stock-transfers',
        loadComponent: () =>
          import('./features/stock-transfers/stock-transfers.component').then(
            (m) => m.StockTransfersComponent,
          ),
      },
      {
        path: 'reorder-alerts',
        loadComponent: () =>
          import('./features/reorder-alerts/reorder-alerts.component').then(
            (m) => m.ReorderAlertsComponent,
          ),
      },
      {
        path: 'tasks',
        loadComponent: () =>
          import('./features/tasks/tasks.component').then(
            (m) => m.TasksComponent,
          ),
      },
      {
        path: 'crm',
        loadChildren: () =>
          import('./features/crm/crm.routes').then((m) => m.CRM_ROUTES),
      },
    ],
  },

  // Wildcard
  { path: '**', redirectTo: 'dashboard' },
];
