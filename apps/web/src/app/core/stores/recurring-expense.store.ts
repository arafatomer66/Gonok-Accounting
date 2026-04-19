import { computed, inject } from '@angular/core';
import {
  signalStore,
  withState,
  withComputed,
  withMethods,
  patchState,
} from '@ngrx/signals';
import { PouchDbService } from '../services/pouchdb.service';
import { AuthStore } from './auth.store';
import { IRecurringExpense, ETables } from '@org/shared-types';
import { ActivityLogService } from '../services/activity-log.service';
import { ExpenseStore } from './expense.store';

interface RecurringExpenseState {
  recurringExpenses: IRecurringExpense[];
  loading: boolean;
  initialized: boolean;
}

const initialState: RecurringExpenseState = {
  recurringExpenses: [],
  loading: false,
  initialized: false,
};

export const RecurringExpenseStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed((store) => ({
    activeRecurring: computed(() => store.recurringExpenses().filter((r) => r.active)),
    overdueRecurring: computed(() => {
      const now = Date.now();
      return store.recurringExpenses().filter((r) => r.active && r.next_due_date <= now);
    }),
  })),
  withMethods((store) => {
    const pouchDb = inject(PouchDbService);
    const authStore = inject(AuthStore);
    const activityLog = inject(ActivityLogService);
    const expenseStore = inject(ExpenseStore);

    function getBizUuid(): string {
      const uuid = authStore.activeBusinessUuid();
      if (!uuid) throw new Error('No active business');
      return uuid;
    }

    function calculateNextDueDate(current: number, frequency: string): number {
      const d = new Date(current);
      switch (frequency) {
        case 'daily': d.setDate(d.getDate() + 1); break;
        case 'weekly': d.setDate(d.getDate() + 7); break;
        case 'monthly': d.setMonth(d.getMonth() + 1); break;
        case 'yearly': d.setFullYear(d.getFullYear() + 1); break;
      }
      return d.getTime();
    }

    return {
      async loadAll(): Promise<void> {
        const bizUuid = getBizUuid();
        patchState(store, { loading: true });
        const recurringExpenses = await pouchDb.findByBusiness<IRecurringExpense>(
          ETables.RECURRING_EXPENSE,
          bizUuid,
        );
        patchState(store, { recurringExpenses, loading: false, initialized: true });
      },

      async addRecurring(data: Partial<IRecurringExpense>): Promise<IRecurringExpense> {
        const bizUuid = getBizUuid();
        const uuid = crypto.randomUUID();
        const now = Date.now();

        const recurring: IRecurringExpense = {
          uuid,
          table_type: ETables.RECURRING_EXPENSE,
          business_uuid: bizUuid,
          branch_uuid: null,
          name: data.name || '',
          category_uuid: data.category_uuid ?? null,
          amount: data.amount ?? 0,
          frequency: data.frequency ?? 'monthly',
          start_date: data.start_date ?? now,
          next_due_date: data.next_due_date ?? data.start_date ?? now,
          last_generated_date: null,
          active: data.active ?? true,
          description: data.description ?? null,
          payment_type: data.payment_type ?? 'Cash',
          created_at: now,
          updated_at: now,
          created_by: null,
          updated_by: null,
        };

        await pouchDb.put(ETables.RECURRING_EXPENSE, uuid, recurring as unknown as Record<string, unknown>);
        patchState(store, { recurringExpenses: [...store.recurringExpenses(), recurring] });
        activityLog.log('create', 'recurring_expense', recurring.name, `${recurring.frequency} - ${recurring.amount}`);
        return recurring;
      },

      async updateRecurring(uuid: string, data: Partial<IRecurringExpense>): Promise<void> {
        const existing = store.recurringExpenses().find((r) => r.uuid === uuid);
        if (!existing) return;

        const updated: IRecurringExpense = { ...existing, ...data, updated_at: Date.now() };
        await pouchDb.put(ETables.RECURRING_EXPENSE, uuid, updated as unknown as Record<string, unknown>);
        patchState(store, {
          recurringExpenses: store.recurringExpenses().map((r) => (r.uuid === uuid ? updated : r)),
        });
      },

      async deleteRecurring(uuid: string): Promise<void> {
        const existing = store.recurringExpenses().find((r) => r.uuid === uuid);
        if (!existing) return;

        await pouchDb.remove(ETables.RECURRING_EXPENSE, uuid);
        patchState(store, {
          recurringExpenses: store.recurringExpenses().filter((r) => r.uuid !== uuid),
        });
        activityLog.log('delete', 'recurring_expense', existing.name, '');
      },

      async generateDueExpenses(): Promise<number> {
        const now = Date.now();
        const overdue = store.recurringExpenses().filter((r) => r.active && r.next_due_date <= now);
        let count = 0;

        for (const recurring of overdue) {
          // Create an expense from this recurring entry
          await expenseStore.addExpense(
            {
              category_uuid: recurring.category_uuid,
              expense_date: recurring.next_due_date,
              description: `[Auto] ${recurring.name}`,
              payment_type: recurring.payment_type,
              total_amount: recurring.amount,
              total_quantity: 1,
            },
            [
              {
                item_name: recurring.name,
                rate: recurring.amount,
                quantity: 1,
                amount: recurring.amount,
              },
            ],
          );

          // Update next due date
          const nextDue = calculateNextDueDate(recurring.next_due_date, recurring.frequency);
          const updated: IRecurringExpense = {
            ...recurring,
            next_due_date: nextDue,
            last_generated_date: now,
            updated_at: now,
          };
          await pouchDb.put(ETables.RECURRING_EXPENSE, recurring.uuid, updated as unknown as Record<string, unknown>);
          patchState(store, {
            recurringExpenses: store.recurringExpenses().map((r) =>
              r.uuid === recurring.uuid ? updated : r,
            ),
          });
          count++;
        }

        if (count > 0) {
          activityLog.log('create', 'recurring_expense', 'Auto-generation', `Generated ${count} expenses`);
        }
        return count;
      },

      reset(): void {
        patchState(store, { ...initialState });
      },
    };
  }),
);
