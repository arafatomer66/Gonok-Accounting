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
import { CatalogStore } from './catalog.store';
import {
  ITransaction,
  ITransactionItem,
  ETables,
  ETransactionType,
  EPartyType,
} from '@org/shared-types';

interface TransactionState {
  transactions: ITransaction[];
  loading: boolean;
  initialized: boolean;
}

const initialState: TransactionState = {
  transactions: [],
  loading: false,
  initialized: false,
};

export const TransactionStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed((store) => ({
    sales: computed(() =>
      store.transactions().filter((t) => t.type === ETransactionType.SALES),
    ),
    purchases: computed(() =>
      store.transactions().filter((t) => t.type === ETransactionType.PURCHASE),
    ),
    salesReturns: computed(() =>
      store.transactions().filter((t) => t.type === ETransactionType.SALES_RETURN),
    ),
    purchaseReturns: computed(() =>
      store.transactions().filter((t) => t.type === ETransactionType.PURCHASE_RETURN),
    ),
    paymentsIn: computed(() =>
      store.transactions().filter((t) => t.type === ETransactionType.PAYMENT_IN),
    ),
    paymentsOut: computed(() =>
      store.transactions().filter((t) => t.type === ETransactionType.PAYMENT_OUT),
    ),
  })),
  withMethods((store) => {
    const pouchDb = inject(PouchDbService);
    const authStore = inject(AuthStore);
    const catalogStore = inject(CatalogStore);

    function getBizUuid(): string {
      const uuid = authStore.activeBusinessUuid();
      if (!uuid) throw new Error('No active business');
      return uuid;
    }

    function generateInvoiceNo(type: ETransactionType): string {
      const prefix =
        type === ETransactionType.SALES ? 'INV' :
        type === ETransactionType.PURCHASE ? 'PO' :
        type === ETransactionType.SALES_RETURN ? 'SR' :
        type === ETransactionType.PURCHASE_RETURN ? 'PR' :
        type === ETransactionType.PAYMENT_IN ? 'RCV' : 'PAY';
      return `${prefix}-${Date.now().toString(36).toUpperCase()}`;
    }

    // ─── Stock Logic ─────────────────────────────────
    function updateProductStock(
      items: ITransactionItem[],
      type: ETransactionType,
      direction: 'apply' | 'reverse',
    ): void {
      if (
        type === ETransactionType.PAYMENT_IN ||
        type === ETransactionType.PAYMENT_OUT
      )
        return;

      const stockDecreases =
        type === ETransactionType.SALES ||
        type === ETransactionType.PURCHASE_RETURN;

      for (const item of items) {
        const product = catalogStore.products().find((p) => p.uuid === item.item_uuid);
        if (!product) continue;
        const qty = Number(item.quantity);
        const shouldDecrease =
          (stockDecreases && direction === 'apply') ||
          (!stockDecreases && direction === 'reverse');

        const newQty = product.quantity + (shouldDecrease ? -qty : qty);
        catalogStore.updateProduct(product.uuid, { quantity: newQty });
      }
    }

    // ─── Balance Logic ───────────────────────────────
    function updatePartyBalance(
      transaction: ITransaction,
      direction: 'apply' | 'reverse',
    ): void {
      if (!transaction.party_uuid) return;
      const bizUuid = getBizUuid();
      if (transaction.party_uuid === bizUuid) return; // Cash Sale — no balance

      const party = catalogStore.parties().find((p) => p.uuid === transaction.party_uuid);
      if (!party) return;

      const isCustomer = party.party_type === EPartyType.CUSTOMER;
      const type = transaction.type as ETransactionType;
      let delta = 0;

      if (isCustomer) {
        if (type === ETransactionType.SALES || type === ETransactionType.PURCHASE_RETURN) {
          delta = Number(transaction.due_amount);
        } else if (type === ETransactionType.PAYMENT_IN) {
          delta = -Number(transaction.paid_amount);
        } else if (type === ETransactionType.PURCHASE || type === ETransactionType.SALES_RETURN) {
          delta = -Number(transaction.due_amount);
        } else if (type === ETransactionType.PAYMENT_OUT) {
          delta = Number(transaction.paid_amount);
        }
      } else {
        // Supplier
        if (type === ETransactionType.PURCHASE || type === ETransactionType.SALES_RETURN) {
          delta = Number(transaction.due_amount);
        } else if (type === ETransactionType.PAYMENT_OUT) {
          delta = -Number(transaction.paid_amount);
        } else if (type === ETransactionType.SALES || type === ETransactionType.PURCHASE_RETURN) {
          delta = -Number(transaction.due_amount);
        } else if (type === ETransactionType.PAYMENT_IN) {
          delta = Number(transaction.paid_amount);
        }
      }

      if (direction === 'reverse') delta = -delta;

      catalogStore.updateParty(party.uuid, {
        current_balance: party.current_balance + delta,
      });
    }

    // ─── Save items to PouchDB ───────────────────────
    async function saveTransactionItems(
      items: ITransactionItem[],
    ): Promise<void> {
      for (const item of items) {
        await pouchDb.put(
          ETables.TRANSACTION_ITEM,
          item.uuid,
          item as unknown as Record<string, unknown>,
        );
      }
    }

    return {
      async loadAll(): Promise<void> {
        const bizUuid = getBizUuid();
        patchState(store, { loading: true });
        const transactions = await pouchDb.findByBusiness<ITransaction>(
          ETables.TRANSACTION,
          bizUuid,
        );
        patchState(store, {
          transactions,
          loading: false,
          initialized: true,
        });
      },

      async addTransaction(
        data: Partial<ITransaction>,
        items: Partial<ITransactionItem>[],
      ): Promise<ITransaction> {
        const bizUuid = getBizUuid();
        const uuid = crypto.randomUUID();
        const now = Date.now();
        const type = data.type as ETransactionType;

        const transaction: ITransaction = {
          uuid,
          table_type: ETables.TRANSACTION,
          business_uuid: bizUuid,
          branch_uuid: null,
          type: data.type ?? null,
          party_uuid: data.party_uuid ?? null,
          transaction_date: data.transaction_date ?? now,
          transaction_mode: data.transaction_mode ?? null,
          description: data.description ?? null,
          order_number: data.order_number ?? generateInvoiceNo(type),
          payment_type: data.payment_type ?? null,
          cheque_ref_no: data.cheque_ref_no ?? null,
          items: [],
          discount: data.discount ?? 0,
          total_amount: data.total_amount ?? 0,
          paid_amount: data.paid_amount ?? 0,
          due_amount: data.due_amount ?? 0,
          quantity: data.quantity ?? 0,
          bill_date: data.bill_date ?? 0,
          total_tax: data.total_tax ?? 0,
          bill_no: data.bill_no ?? null,
          invoice_date: data.invoice_date ?? now,
          invoice_no: data.invoice_no ?? generateInvoiceNo(type),
          return_no: data.return_no ?? null,
          created_at: now,
          updated_at: now,
          created_by: null,
          updated_by: null,
        };

        // Build transaction items
        const txItems: ITransactionItem[] = items.map((item) => ({
          uuid: crypto.randomUUID(),
          table_type: ETables.TRANSACTION_ITEM,
          business_uuid: bizUuid,
          branch_uuid: null,
          party_uuid: transaction.party_uuid,
          transaction_uuid: uuid,
          transaction_type: transaction.type,
          item_uuid: item.item_uuid ?? null,
          purchase_price: item.purchase_price ?? 0,
          sales_price: item.sales_price ?? 0,
          item_wise_tax: item.item_wise_tax ?? 0,
          total_tax: item.total_tax ?? 0,
          quantity: item.quantity ?? 0,
          transaction_date: transaction.transaction_date,
          created_at: now,
          updated_at: now,
          created_by: null,
          updated_by: null,
        }));

        // Save to PouchDB
        await pouchDb.put(
          ETables.TRANSACTION,
          uuid,
          transaction as unknown as Record<string, unknown>,
        );
        await saveTransactionItems(txItems);

        // Update stock & balance
        updateProductStock(txItems, type, 'apply');
        updatePartyBalance(transaction, 'apply');

        patchState(store, {
          transactions: [...store.transactions(), transaction],
        });
        return transaction;
      },

      async updateTransaction(
        uuid: string,
        data: Partial<ITransaction>,
        items: Partial<ITransactionItem>[],
      ): Promise<ITransaction> {
        const bizUuid = getBizUuid();
        const now = Date.now();
        const existing = store.transactions().find((t) => t.uuid === uuid);
        if (!existing) throw new Error('Transaction not found');

        const type = existing.type as ETransactionType;

        // Reverse old stock & balance
        const oldItems = await pouchDb.findByBusiness<ITransactionItem>(
          ETables.TRANSACTION_ITEM,
          bizUuid,
        );
        const prevItems = oldItems.filter(
          (i) => i.transaction_uuid === uuid,
        );
        updateProductStock(prevItems, type, 'reverse');
        updatePartyBalance(existing, 'reverse');

        // Delete old items
        for (const item of prevItems) {
          await pouchDb.remove(ETables.TRANSACTION_ITEM, item.uuid);
        }

        // Build updated transaction
        const updated: ITransaction = {
          ...existing,
          ...data,
          updated_at: now,
          items: [],
        };

        // Build new items
        const txItems: ITransactionItem[] = items.map((item) => ({
          uuid: crypto.randomUUID(),
          table_type: ETables.TRANSACTION_ITEM,
          business_uuid: bizUuid,
          branch_uuid: null,
          party_uuid: updated.party_uuid,
          transaction_uuid: uuid,
          transaction_type: updated.type,
          item_uuid: item.item_uuid ?? null,
          purchase_price: item.purchase_price ?? 0,
          sales_price: item.sales_price ?? 0,
          item_wise_tax: item.item_wise_tax ?? 0,
          total_tax: item.total_tax ?? 0,
          quantity: item.quantity ?? 0,
          transaction_date: updated.transaction_date,
          created_at: now,
          updated_at: now,
          created_by: null,
          updated_by: null,
        }));

        // Save
        await pouchDb.put(
          ETables.TRANSACTION,
          uuid,
          updated as unknown as Record<string, unknown>,
        );
        await saveTransactionItems(txItems);

        // Apply new stock & balance
        updateProductStock(txItems, type, 'apply');
        updatePartyBalance(updated, 'apply');

        patchState(store, {
          transactions: store
            .transactions()
            .map((t) => (t.uuid === uuid ? updated : t)),
        });
        return updated;
      },

      async deleteTransaction(uuid: string): Promise<void> {
        const bizUuid = getBizUuid();
        const existing = store.transactions().find((t) => t.uuid === uuid);
        if (!existing) return;

        const type = existing.type as ETransactionType;

        // Get items before deletion
        const allItems = await pouchDb.findByBusiness<ITransactionItem>(
          ETables.TRANSACTION_ITEM,
          bizUuid,
        );
        const txItems = allItems.filter(
          (i) => i.transaction_uuid === uuid,
        );

        // Reverse stock & balance
        updateProductStock(txItems, type, 'reverse');
        updatePartyBalance(existing, 'reverse');

        // Delete items then transaction
        for (const item of txItems) {
          await pouchDb.remove(ETables.TRANSACTION_ITEM, item.uuid);
        }
        await pouchDb.remove(ETables.TRANSACTION, uuid);

        patchState(store, {
          transactions: store
            .transactions()
            .filter((t) => t.uuid !== uuid),
        });
      },

      reset(): void {
        patchState(store, { ...initialState });
      },
    };
  }),
);
