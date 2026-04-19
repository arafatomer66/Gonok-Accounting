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
import {
  IExpense,
  IExpenseItem,
  IExpenseCategory,
  IExpenseBareItem,
  ETables,
} from '@org/shared-types';

interface ExpenseState {
  expenses: IExpense[];
  expenseCategories: IExpenseCategory[];
  expenseBareItems: IExpenseBareItem[];
  loading: boolean;
  initialized: boolean;
}

const initialState: ExpenseState = {
  expenses: [],
  expenseCategories: [],
  expenseBareItems: [],
  loading: false,
  initialized: false,
};

export const ExpenseStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed((store) => ({
    totalExpenses: computed(() =>
      store.expenses().reduce((s, e) => s + (e.total_amount || 0), 0),
    ),
  })),
  withMethods((store) => {
    const pouchDb = inject(PouchDbService);
    const authStore = inject(AuthStore);

    function getBizUuid(): string {
      const uuid = authStore.activeBusinessUuid();
      if (!uuid) throw new Error('No active business');
      return uuid;
    }

    async function saveExpenseItems(items: IExpenseItem[]): Promise<void> {
      for (const item of items) {
        await pouchDb.put(
          ETables.EXPENSE_ITEM,
          item.uuid,
          item as unknown as Record<string, unknown>,
        );
      }
    }

    return {
      async loadAll(): Promise<void> {
        const bizUuid = getBizUuid();
        patchState(store, { loading: true });

        const [expenses, expenseCategories, expenseBareItems] =
          await Promise.all([
            pouchDb.findByBusiness<IExpense>(ETables.EXPENSE, bizUuid),
            pouchDb.findByBusiness<IExpenseCategory>(
              ETables.EXPENSE_CATEGORY,
              bizUuid,
            ),
            pouchDb.findByBusiness<IExpenseBareItem>(
              ETables.EXPENSE_BARE_ITEM,
              bizUuid,
            ),
          ]);

        patchState(store, {
          expenses,
          expenseCategories,
          expenseBareItems,
          loading: false,
          initialized: true,
        });
      },

      async addCategory(name: string): Promise<IExpenseCategory> {
        const bizUuid = getBizUuid();
        const now = Date.now();
        const cat: IExpenseCategory = {
          uuid: crypto.randomUUID(),
          table_type: ETables.EXPENSE_CATEGORY,
          name,
          business_uuid: bizUuid,
          branch_uuid: null,
          created_at: now,
          updated_at: now,
          created_by: null,
          updated_by: null,
        };
        await pouchDb.put(
          ETables.EXPENSE_CATEGORY,
          cat.uuid,
          cat as unknown as Record<string, unknown>,
        );
        patchState(store, {
          expenseCategories: [...store.expenseCategories(), cat],
        });
        return cat;
      },

      async addBareItem(name: string): Promise<IExpenseBareItem> {
        const bizUuid = getBizUuid();
        const now = Date.now();
        const item: IExpenseBareItem = {
          uuid: crypto.randomUUID(),
          table_type: ETables.EXPENSE_BARE_ITEM,
          name,
          business_uuid: bizUuid,
          branch_uuid: null,
          created_at: now,
          updated_at: now,
          created_by: null,
          updated_by: null,
        };
        await pouchDb.put(
          ETables.EXPENSE_BARE_ITEM,
          item.uuid,
          item as unknown as Record<string, unknown>,
        );
        patchState(store, {
          expenseBareItems: [...store.expenseBareItems(), item],
        });
        return item;
      },

      async addExpense(
        data: Partial<IExpense>,
        items: Partial<IExpenseItem>[],
      ): Promise<IExpense> {
        const bizUuid = getBizUuid();
        const uuid = crypto.randomUUID();
        const now = Date.now();

        const expense: IExpense = {
          uuid,
          table_type: ETables.EXPENSE,
          business_uuid: bizUuid,
          branch_uuid: null,
          type: data.type ?? null,
          category_uuid: data.category_uuid ?? null,
          expense_date: data.expense_date ?? now,
          description: data.description ?? null,
          payment_type: data.payment_type ?? 'Cash',
          cheque_ref_no: data.cheque_ref_no ?? null,
          bank_account_uuid: data.bank_account_uuid ?? null,
          mobile_tx_id: data.mobile_tx_id ?? null,
          total_amount: data.total_amount ?? 0,
          total_quantity: data.total_quantity ?? 0,
          created_at: now,
          updated_at: now,
          created_by: null,
          updated_by: null,
        };

        const expItems: IExpenseItem[] = items.map((item) => ({
          uuid: crypto.randomUUID(),
          table_type: ETables.EXPENSE_ITEM,
          business_uuid: bizUuid,
          branch_uuid: null,
          expense_uuid: uuid,
          item_uuid: item.item_uuid ?? null,
          item_name: item.item_name ?? null,
          rate: item.rate ?? 0,
          quantity: item.quantity ?? 0,
          amount: item.amount ?? 0,
          expense_date: expense.expense_date,
          created_at: now,
          updated_at: now,
          created_by: null,
          updated_by: null,
        }));

        await pouchDb.put(
          ETables.EXPENSE,
          uuid,
          expense as unknown as Record<string, unknown>,
        );
        await saveExpenseItems(expItems);

        patchState(store, {
          expenses: [...store.expenses(), expense],
        });
        return expense;
      },

      async deleteExpense(uuid: string): Promise<void> {
        const bizUuid = getBizUuid();
        const existing = store.expenses().find((e) => e.uuid === uuid);
        if (!existing) return;

        // Delete items
        const allItems = await pouchDb.findByBusiness<IExpenseItem>(
          ETables.EXPENSE_ITEM,
          bizUuid,
        );
        const expItems = allItems.filter((i) => i.expense_uuid === uuid);
        for (const item of expItems) {
          await pouchDb.remove(ETables.EXPENSE_ITEM, item.uuid);
        }

        await pouchDb.remove(ETables.EXPENSE, uuid);
        patchState(store, {
          expenses: store.expenses().filter((e) => e.uuid !== uuid),
        });
      },

      reset(): void {
        patchState(store, { ...initialState });
      },
    };
  }),
);
