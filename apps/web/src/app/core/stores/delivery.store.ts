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
import { IDelivery, IDeliveryItem, ETables } from '@org/shared-types';
import { ActivityLogService } from '../services/activity-log.service';

interface DeliveryState {
  deliveries: IDelivery[];
  loading: boolean;
  initialized: boolean;
}

const initialState: DeliveryState = {
  deliveries: [],
  loading: false,
  initialized: false,
};

export const DeliveryStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed((store) => ({
    pending: computed(() => store.deliveries().filter((d) => d.status === 'pending')),
    dispatched: computed(() => store.deliveries().filter((d) => d.status === 'dispatched')),
    inTransit: computed(() => store.deliveries().filter((d) => d.status === 'in_transit')),
    delivered: computed(() => store.deliveries().filter((d) => d.status === 'delivered')),
  })),
  withMethods((store) => {
    const pouchDb = inject(PouchDbService);
    const authStore = inject(AuthStore);
    const activityLog = inject(ActivityLogService);

    function getBizUuid(): string {
      const uuid = authStore.activeBusinessUuid();
      if (!uuid) throw new Error('No active business');
      return uuid;
    }

    function generateDeliveryNo(): string {
      return `CHN-${Date.now().toString(36).toUpperCase()}`;
    }

    return {
      async loadAll(): Promise<void> {
        const bizUuid = getBizUuid();
        patchState(store, { loading: true });
        const deliveries = await pouchDb.findByBusiness<IDelivery>(
          ETables.DELIVERY,
          bizUuid,
        );
        patchState(store, { deliveries, loading: false, initialized: true });
      },

      async addDelivery(
        data: Partial<IDelivery>,
        items: Partial<IDeliveryItem>[],
      ): Promise<IDelivery> {
        const bizUuid = getBizUuid();
        const uuid = crypto.randomUUID();
        const now = Date.now();

        const delivery: IDelivery = {
          uuid,
          table_type: ETables.DELIVERY,
          business_uuid: bizUuid,
          branch_uuid: null,
          delivery_no: data.delivery_no ?? generateDeliveryNo(),
          transaction_uuid: data.transaction_uuid ?? null,
          party_uuid: data.party_uuid ?? null,
          delivery_date: data.delivery_date ?? now,
          delivery_address: data.delivery_address ?? null,
          driver_name: data.driver_name ?? null,
          driver_phone: data.driver_phone ?? null,
          vehicle_no: data.vehicle_no ?? null,
          status: data.status ?? 'pending',
          notes: data.notes ?? null,
          total_items: items.length,
          total_quantity: items.reduce((s, i) => s + (i.delivered_quantity ?? 0), 0),
          created_at: now,
          updated_at: now,
          created_by: null,
          updated_by: null,
        };

        const dItems: IDeliveryItem[] = items.map((item) => ({
          uuid: crypto.randomUUID(),
          table_type: ETables.DELIVERY_ITEM,
          business_uuid: bizUuid,
          branch_uuid: null,
          delivery_uuid: uuid,
          item_uuid: item.item_uuid ?? null,
          ordered_quantity: item.ordered_quantity ?? 0,
          delivered_quantity: item.delivered_quantity ?? 0,
          created_at: now,
          updated_at: now,
          created_by: null,
          updated_by: null,
        }));

        await pouchDb.put(ETables.DELIVERY, uuid, delivery as unknown as Record<string, unknown>);
        for (const item of dItems) {
          await pouchDb.put(ETables.DELIVERY_ITEM, item.uuid, item as unknown as Record<string, unknown>);
        }

        patchState(store, { deliveries: [...store.deliveries(), delivery] });
        activityLog.log('create', 'delivery', delivery.delivery_no || uuid, `${delivery.total_items} items, Qty: ${delivery.total_quantity}`);
        return delivery;
      },

      async updateDelivery(uuid: string, data: Partial<IDelivery>): Promise<void> {
        const existing = store.deliveries().find((d) => d.uuid === uuid);
        if (!existing) return;

        const updated: IDelivery = { ...existing, ...data, updated_at: Date.now() };
        await pouchDb.put(ETables.DELIVERY, uuid, updated as unknown as Record<string, unknown>);
        patchState(store, {
          deliveries: store.deliveries().map((d) => (d.uuid === uuid ? updated : d)),
        });

        if (data.status && data.status !== existing.status) {
          activityLog.log('update', 'delivery', existing.delivery_no || uuid, `Status: ${existing.status} → ${data.status}`);
        }
      },

      async deleteDelivery(uuid: string): Promise<void> {
        const bizUuid = getBizUuid();
        const existing = store.deliveries().find((d) => d.uuid === uuid);
        if (!existing) return;

        const allItems = await pouchDb.findByBusiness<IDeliveryItem>(ETables.DELIVERY_ITEM, bizUuid);
        const dItems = allItems.filter((i) => i.delivery_uuid === uuid);
        for (const item of dItems) {
          await pouchDb.remove(ETables.DELIVERY_ITEM, item.uuid);
        }

        await pouchDb.remove(ETables.DELIVERY, uuid);
        patchState(store, { deliveries: store.deliveries().filter((d) => d.uuid !== uuid) });
        activityLog.log('delete', 'delivery', existing.delivery_no || uuid, '');
      },

      async getDeliveryItems(deliveryUuid: string): Promise<IDeliveryItem[]> {
        const bizUuid = getBizUuid();
        const allItems = await pouchDb.findByBusiness<IDeliveryItem>(ETables.DELIVERY_ITEM, bizUuid);
        return allItems.filter((i) => i.delivery_uuid === deliveryUuid);
      },

      getDeliveriesForTransaction(txUuid: string): IDelivery[] {
        return store.deliveries().filter((d) => d.transaction_uuid === txUuid);
      },

      reset(): void {
        patchState(store, { ...initialState });
      },
    };
  }),
);
