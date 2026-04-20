import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthStore } from '../stores/auth.store';
import { CatalogStore } from '../stores/catalog.store';
import { TransactionStore } from '../stores/transaction.store';
import { ExpenseStore } from '../stores/expense.store';
import { CrmStore } from '../stores/crm.store';

@Injectable({ providedIn: 'root' })
export class BusinessSwitchService {
  private authStore = inject(AuthStore);
  private catalogStore = inject(CatalogStore);
  private transactionStore = inject(TransactionStore);
  private expenseStore = inject(ExpenseStore);
  private crmStore = inject(CrmStore);
  private router = inject(Router);

  async switchTo(uuid: string): Promise<void> {
    this.authStore.switchBusiness(uuid);

    // Reset all stores
    this.catalogStore.reset();
    this.transactionStore.reset();
    this.expenseStore.reset();
    this.crmStore.reset();

    // Reload with new business data
    await Promise.all([
      this.catalogStore.loadAll(),
      this.transactionStore.loadAll(),
      this.expenseStore.loadAll(),
      this.crmStore.loadAll(),
    ]);

    // Navigate to dashboard
    this.router.navigate(['/dashboard']);
  }
}
