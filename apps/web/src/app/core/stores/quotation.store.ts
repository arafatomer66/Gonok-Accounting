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
import { IQuotation, IQuotationItem, ETables } from '@org/shared-types';
import { ActivityLogService } from '../services/activity-log.service';

interface QuotationState {
  quotations: IQuotation[];
  loading: boolean;
  initialized: boolean;
}

const initialState: QuotationState = {
  quotations: [],
  loading: false,
  initialized: false,
};

export const QuotationStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed((store) => ({
    drafts: computed(() => store.quotations().filter((q) => q.status === 'draft')),
    sent: computed(() => store.quotations().filter((q) => q.status === 'sent')),
    accepted: computed(() => store.quotations().filter((q) => q.status === 'accepted')),
    converted: computed(() => store.quotations().filter((q) => q.status === 'converted')),
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

    function generateQuotationNo(): string {
      return `QTN-${Date.now().toString(36).toUpperCase()}`;
    }

    return {
      async loadAll(): Promise<void> {
        const bizUuid = getBizUuid();
        patchState(store, { loading: true });
        const quotations = await pouchDb.findByBusiness<IQuotation>(
          ETables.QUOTATION,
          bizUuid,
        );
        patchState(store, { quotations, loading: false, initialized: true });
      },

      async addQuotation(
        data: Partial<IQuotation>,
        items: Partial<IQuotationItem>[],
      ): Promise<IQuotation> {
        const bizUuid = getBizUuid();
        const uuid = crypto.randomUUID();
        const now = Date.now();

        const quotation: IQuotation = {
          uuid,
          table_type: ETables.QUOTATION,
          business_uuid: bizUuid,
          branch_uuid: null,
          party_uuid: data.party_uuid ?? null,
          quotation_no: data.quotation_no ?? generateQuotationNo(),
          quotation_date: data.quotation_date ?? now,
          valid_until: data.valid_until ?? now + 30 * 24 * 60 * 60 * 1000,
          status: data.status ?? 'draft',
          notes: data.notes ?? null,
          discount: data.discount ?? 0,
          total_amount: data.total_amount ?? 0,
          total_tax: data.total_tax ?? 0,
          converted_transaction_uuid: null,
          created_at: now,
          updated_at: now,
          created_by: null,
          updated_by: null,
        };

        const qItems: IQuotationItem[] = items.map((item) => ({
          uuid: crypto.randomUUID(),
          table_type: ETables.QUOTATION_ITEM,
          business_uuid: bizUuid,
          branch_uuid: null,
          quotation_uuid: uuid,
          item_uuid: item.item_uuid ?? null,
          quantity: item.quantity ?? 0,
          price: item.price ?? 0,
          discount: item.discount ?? 0,
          total: item.total ?? 0,
          created_at: now,
          updated_at: now,
          created_by: null,
          updated_by: null,
        }));

        await pouchDb.put(ETables.QUOTATION, uuid, quotation as unknown as Record<string, unknown>);
        for (const item of qItems) {
          await pouchDb.put(ETables.QUOTATION_ITEM, item.uuid, item as unknown as Record<string, unknown>);
        }

        patchState(store, { quotations: [...store.quotations(), quotation] });
        activityLog.log('create', 'quotation', quotation.quotation_no || uuid, `Amount: ${quotation.total_amount}`);
        return quotation;
      },

      async updateQuotation(uuid: string, data: Partial<IQuotation>): Promise<void> {
        const existing = store.quotations().find((q) => q.uuid === uuid);
        if (!existing) return;

        const updated: IQuotation = { ...existing, ...data, updated_at: Date.now() };
        await pouchDb.put(ETables.QUOTATION, uuid, updated as unknown as Record<string, unknown>);
        patchState(store, {
          quotations: store.quotations().map((q) => (q.uuid === uuid ? updated : q)),
        });
      },

      async deleteQuotation(uuid: string): Promise<void> {
        const bizUuid = getBizUuid();
        const existing = store.quotations().find((q) => q.uuid === uuid);
        if (!existing) return;

        // Delete items
        const allItems = await pouchDb.findByBusiness<IQuotationItem>(ETables.QUOTATION_ITEM, bizUuid);
        const qItems = allItems.filter((i) => i.quotation_uuid === uuid);
        for (const item of qItems) {
          await pouchDb.remove(ETables.QUOTATION_ITEM, item.uuid);
        }

        await pouchDb.remove(ETables.QUOTATION, uuid);
        patchState(store, { quotations: store.quotations().filter((q) => q.uuid !== uuid) });
        activityLog.log('delete', 'quotation', existing.quotation_no || uuid, `Amount: ${existing.total_amount}`);
      },

      async getQuotationItems(quotationUuid: string): Promise<IQuotationItem[]> {
        const bizUuid = getBizUuid();
        const allItems = await pouchDb.findByBusiness<IQuotationItem>(ETables.QUOTATION_ITEM, bizUuid);
        return allItems.filter((i) => i.quotation_uuid === quotationUuid);
      },

      reset(): void {
        patchState(store, { ...initialState });
      },
    };
  }),
);
