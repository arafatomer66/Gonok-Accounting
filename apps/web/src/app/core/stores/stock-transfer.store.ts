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
  IStockTransfer,
  IStockTransferItem,
  ETables,
  EStockTransferStatus,
} from '@org/shared-types';
import { ActivityLogService } from '../services/activity-log.service';

interface StockTransferState {
  transfers: IStockTransfer[];
  loading: boolean;
  initialized: boolean;
}

const initialState: StockTransferState = {
  transfers: [],
  loading: false,
  initialized: false,
};

export const StockTransferStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed((store) => ({
    draftTransfers: computed(() =>
      store.transfers().filter((t) => t.status === EStockTransferStatus.DRAFT),
    ),
    inTransitTransfers: computed(() =>
      store.transfers().filter((t) => t.status === EStockTransferStatus.IN_TRANSIT),
    ),
    completedTransfers: computed(() =>
      store.transfers().filter((t) => t.status === EStockTransferStatus.RECEIVED),
    ),
    cancelledTransfers: computed(() =>
      store.transfers().filter((t) => t.status === EStockTransferStatus.CANCELLED),
    ),
  })),
  withMethods((store) => {
    const pouchDb = inject(PouchDbService);
    const authStore = inject(AuthStore);
    const catalogStore = inject(CatalogStore);
    const activityLog = inject(ActivityLogService);

    function getBizUuid(): string {
      const uuid = authStore.activeBusinessUuid();
      if (!uuid) throw new Error('No active business');
      return uuid;
    }

    function generateTransferNo(): string {
      return `STR-${Date.now().toString(36).toUpperCase()}`;
    }

    return {
      async loadAll(): Promise<void> {
        const bizUuid = getBizUuid();
        patchState(store, { loading: true });
        const transfers = await pouchDb.findByBusiness<IStockTransfer>(
          ETables.STOCK_TRANSFER,
          bizUuid,
        );
        patchState(store, { transfers, loading: false, initialized: true });
      },

      async addTransfer(
        data: Partial<IStockTransfer>,
        items: Partial<IStockTransferItem>[],
      ): Promise<IStockTransfer> {
        const bizUuid = getBizUuid();
        const uuid = crypto.randomUUID();
        const now = Date.now();

        const transfer: IStockTransfer = {
          uuid,
          table_type: ETables.STOCK_TRANSFER,
          business_uuid: bizUuid,
          branch_uuid: null,
          transfer_no: generateTransferNo(),
          from_branch_uuid: data.from_branch_uuid ?? '',
          from_branch_name: data.from_branch_name ?? '',
          to_branch_uuid: data.to_branch_uuid ?? '',
          to_branch_name: data.to_branch_name ?? '',
          transfer_date: data.transfer_date ?? now,
          received_date: null,
          status: EStockTransferStatus.DRAFT,
          total_items: items.length,
          total_quantity: items.reduce((s, i) => s + (i.quantity ?? 0), 0),
          notes: data.notes ?? null,
          created_at: now,
          updated_at: now,
          created_by: null,
          updated_by: null,
        };

        const transferItems: IStockTransferItem[] = items.map((item) => ({
          uuid: crypto.randomUUID(),
          table_type: ETables.STOCK_TRANSFER_ITEM,
          business_uuid: bizUuid,
          transfer_uuid: uuid,
          item_uuid: item.item_uuid ?? '',
          item_name: item.item_name ?? null,
          quantity: item.quantity ?? 0,
          unit: item.unit ?? null,
          created_at: now,
          updated_at: now,
          created_by: null,
          updated_by: null,
        }));

        await pouchDb.put(ETables.STOCK_TRANSFER, uuid, transfer as unknown as Record<string, unknown>);
        for (const item of transferItems) {
          await pouchDb.put(ETables.STOCK_TRANSFER_ITEM, item.uuid, item as unknown as Record<string, unknown>);
        }

        patchState(store, { transfers: [...store.transfers(), transfer] });
        activityLog.log('create', 'stock_transfer', transfer.transfer_no, `${transfer.total_items} items, Qty: ${transfer.total_quantity}`);
        return transfer;
      },

      async updateTransfer(
        uuid: string,
        data: Partial<IStockTransfer>,
        items?: Partial<IStockTransferItem>[],
      ): Promise<void> {
        const bizUuid = getBizUuid();
        const existing = store.transfers().find((t) => t.uuid === uuid);
        if (!existing || existing.status !== EStockTransferStatus.DRAFT) return;

        const totalItems = items ? items.length : existing.total_items;
        const totalQty = items
          ? items.reduce((s, i) => s + (i.quantity ?? 0), 0)
          : existing.total_quantity;

        const updated: IStockTransfer = {
          ...existing,
          ...data,
          total_items: totalItems,
          total_quantity: totalQty,
          updated_at: Date.now(),
        };
        await pouchDb.put(ETables.STOCK_TRANSFER, uuid, updated as unknown as Record<string, unknown>);

        if (items) {
          const allItems = await pouchDb.findByBusiness<IStockTransferItem>(ETables.STOCK_TRANSFER_ITEM, bizUuid);
          const oldItems = allItems.filter((i) => i.transfer_uuid === uuid);
          for (const old of oldItems) {
            await pouchDb.remove(ETables.STOCK_TRANSFER_ITEM, old.uuid);
          }
          const now = Date.now();
          for (const item of items) {
            const newItem: IStockTransferItem = {
              uuid: crypto.randomUUID(),
              table_type: ETables.STOCK_TRANSFER_ITEM,
              business_uuid: bizUuid,
              transfer_uuid: uuid,
              item_uuid: item.item_uuid ?? '',
              item_name: item.item_name ?? null,
              quantity: item.quantity ?? 0,
              unit: item.unit ?? null,
              created_at: now,
              updated_at: now,
              created_by: null,
              updated_by: null,
            };
            await pouchDb.put(ETables.STOCK_TRANSFER_ITEM, newItem.uuid, newItem as unknown as Record<string, unknown>);
          }
        }

        patchState(store, {
          transfers: store.transfers().map((t) => (t.uuid === uuid ? updated : t)),
        });
        activityLog.log('update', 'stock_transfer', existing.transfer_no, `Updated draft`);
      },

      async dispatchTransfer(uuid: string): Promise<boolean> {
        const existing = store.transfers().find((t) => t.uuid === uuid);
        if (!existing || existing.status !== EStockTransferStatus.DRAFT) return false;

        const bizUuid = getBizUuid();
        const allItems = await pouchDb.findByBusiness<IStockTransferItem>(ETables.STOCK_TRANSFER_ITEM, bizUuid);
        const transferItems = allItems.filter((i) => i.transfer_uuid === uuid);

        // Check stock availability
        for (const item of transferItems) {
          const product = catalogStore.products().find((p) => p.uuid === item.item_uuid);
          if (!product || product.quantity < item.quantity) {
            return false;
          }
        }

        // Deduct stock
        for (const item of transferItems) {
          const product = catalogStore.products().find((p) => p.uuid === item.item_uuid);
          if (product) {
            await catalogStore.updateProduct(product.uuid, {
              quantity: product.quantity - item.quantity,
            });
          }
        }

        const updated: IStockTransfer = {
          ...existing,
          status: EStockTransferStatus.IN_TRANSIT,
          updated_at: Date.now(),
        };
        await pouchDb.put(ETables.STOCK_TRANSFER, uuid, updated as unknown as Record<string, unknown>);
        patchState(store, {
          transfers: store.transfers().map((t) => (t.uuid === uuid ? updated : t)),
        });
        activityLog.log('update', 'stock_transfer', existing.transfer_no, `Dispatched — stock deducted`);
        return true;
      },

      async receiveTransfer(uuid: string): Promise<void> {
        const existing = store.transfers().find((t) => t.uuid === uuid);
        if (!existing || existing.status !== EStockTransferStatus.IN_TRANSIT) return;

        const bizUuid = getBizUuid();
        const allItems = await pouchDb.findByBusiness<IStockTransferItem>(ETables.STOCK_TRANSFER_ITEM, bizUuid);
        const transferItems = allItems.filter((i) => i.transfer_uuid === uuid);

        // Restore stock at destination (since we use global quantity)
        for (const item of transferItems) {
          const product = catalogStore.products().find((p) => p.uuid === item.item_uuid);
          if (product) {
            await catalogStore.updateProduct(product.uuid, {
              quantity: product.quantity + item.quantity,
            });
          }
        }

        const updated: IStockTransfer = {
          ...existing,
          status: EStockTransferStatus.RECEIVED,
          received_date: Date.now(),
          updated_at: Date.now(),
        };
        await pouchDb.put(ETables.STOCK_TRANSFER, uuid, updated as unknown as Record<string, unknown>);
        patchState(store, {
          transfers: store.transfers().map((t) => (t.uuid === uuid ? updated : t)),
        });
        activityLog.log('update', 'stock_transfer', existing.transfer_no, `Received — stock restored`);
      },

      async cancelTransfer(uuid: string): Promise<void> {
        const existing = store.transfers().find((t) => t.uuid === uuid);
        if (!existing) return;

        // If in transit, restore stock
        if (existing.status === EStockTransferStatus.IN_TRANSIT) {
          const bizUuid = getBizUuid();
          const allItems = await pouchDb.findByBusiness<IStockTransferItem>(ETables.STOCK_TRANSFER_ITEM, bizUuid);
          const transferItems = allItems.filter((i) => i.transfer_uuid === uuid);

          for (const item of transferItems) {
            const product = catalogStore.products().find((p) => p.uuid === item.item_uuid);
            if (product) {
              await catalogStore.updateProduct(product.uuid, {
                quantity: product.quantity + item.quantity,
              });
            }
          }
        }

        const updated: IStockTransfer = {
          ...existing,
          status: EStockTransferStatus.CANCELLED,
          updated_at: Date.now(),
        };
        await pouchDb.put(ETables.STOCK_TRANSFER, uuid, updated as unknown as Record<string, unknown>);
        patchState(store, {
          transfers: store.transfers().map((t) => (t.uuid === uuid ? updated : t)),
        });
        activityLog.log('update', 'stock_transfer', existing.transfer_no, `Cancelled${existing.status === EStockTransferStatus.IN_TRANSIT ? ' — stock restored' : ''}`);
      },

      async deleteTransfer(uuid: string): Promise<void> {
        const bizUuid = getBizUuid();
        const existing = store.transfers().find((t) => t.uuid === uuid);
        if (!existing || existing.status !== EStockTransferStatus.DRAFT) return;

        const allItems = await pouchDb.findByBusiness<IStockTransferItem>(ETables.STOCK_TRANSFER_ITEM, bizUuid);
        const transferItems = allItems.filter((i) => i.transfer_uuid === uuid);
        for (const item of transferItems) {
          await pouchDb.remove(ETables.STOCK_TRANSFER_ITEM, item.uuid);
        }

        await pouchDb.remove(ETables.STOCK_TRANSFER, uuid);
        patchState(store, { transfers: store.transfers().filter((t) => t.uuid !== uuid) });
        activityLog.log('delete', 'stock_transfer', existing.transfer_no, '');
      },

      async getTransferItems(transferUuid: string): Promise<IStockTransferItem[]> {
        const bizUuid = getBizUuid();
        const allItems = await pouchDb.findByBusiness<IStockTransferItem>(ETables.STOCK_TRANSFER_ITEM, bizUuid);
        return allItems.filter((i) => i.transfer_uuid === transferUuid);
      },

      reset(): void {
        patchState(store, { ...initialState });
      },
    };
  }),
);
