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
import { TransactionStore } from './transaction.store';
import {
  IPurchaseOrder,
  IPurchaseOrderItem,
  IGoodsReceiptNote,
  IGoodsReceiptNoteItem,
  ETables,
  ETransactionType,
} from '@org/shared-types';
import { ActivityLogService } from '../services/activity-log.service';

interface PurchaseOrderState {
  purchaseOrders: IPurchaseOrder[];
  loading: boolean;
  initialized: boolean;
}

const initialState: PurchaseOrderState = {
  purchaseOrders: [],
  loading: false,
  initialized: false,
};

export const PurchaseOrderStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed((store) => ({
    drafts: computed(() => store.purchaseOrders().filter((po) => po.status === 'draft')),
    sent: computed(() => store.purchaseOrders().filter((po) => po.status === 'sent')),
    partiallyReceived: computed(() => store.purchaseOrders().filter((po) => po.status === 'partially_received')),
    received: computed(() => store.purchaseOrders().filter((po) => po.status === 'received')),
    cancelled: computed(() => store.purchaseOrders().filter((po) => po.status === 'cancelled')),
    openOrders: computed(() =>
      store.purchaseOrders().filter(
        (po) => po.status === 'draft' || po.status === 'sent' || po.status === 'partially_received',
      ),
    ),
  })),
  withMethods((store) => {
    const pouchDb = inject(PouchDbService);
    const authStore = inject(AuthStore);
    const transactionStore = inject(TransactionStore);
    const activityLog = inject(ActivityLogService);

    function getBizUuid(): string {
      const uuid = authStore.activeBusinessUuid();
      if (!uuid) throw new Error('No active business');
      return uuid;
    }

    function generatePONo(): string {
      return `PO-${Date.now().toString(36).toUpperCase()}`;
    }

    function generateGRNNo(): string {
      return `GRN-${Date.now().toString(36).toUpperCase()}`;
    }

    return {
      async loadAll(): Promise<void> {
        const bizUuid = getBizUuid();
        patchState(store, { loading: true });
        const purchaseOrders = await pouchDb.findByBusiness<IPurchaseOrder>(
          ETables.PURCHASE_ORDER,
          bizUuid,
        );
        patchState(store, { purchaseOrders, loading: false, initialized: true });
      },

      async addPurchaseOrder(
        data: Partial<IPurchaseOrder>,
        items: Partial<IPurchaseOrderItem>[],
      ): Promise<IPurchaseOrder> {
        const bizUuid = getBizUuid();
        const uuid = crypto.randomUUID();
        const now = Date.now();

        const po: IPurchaseOrder = {
          uuid,
          table_type: ETables.PURCHASE_ORDER,
          business_uuid: bizUuid,
          branch_uuid: null,
          party_uuid: data.party_uuid ?? null,
          po_no: data.po_no ?? generatePONo(),
          po_date: data.po_date ?? now,
          expected_delivery_date: data.expected_delivery_date ?? 0,
          status: data.status ?? 'draft',
          notes: data.notes ?? null,
          discount: data.discount ?? 0,
          total_amount: data.total_amount ?? 0,
          total_tax: data.total_tax ?? 0,
          received_amount: 0,
          converted_transaction_uuid: null,
          created_at: now,
          updated_at: now,
          created_by: null,
          updated_by: null,
        };

        const poItems: IPurchaseOrderItem[] = items.map((item) => ({
          uuid: crypto.randomUUID(),
          table_type: ETables.PURCHASE_ORDER_ITEM,
          business_uuid: bizUuid,
          branch_uuid: null,
          po_uuid: uuid,
          item_uuid: item.item_uuid ?? null,
          quantity: item.quantity ?? 0,
          received_quantity: 0,
          price: item.price ?? 0,
          discount: item.discount ?? 0,
          total: item.total ?? 0,
          created_at: now,
          updated_at: now,
          created_by: null,
          updated_by: null,
        }));

        await pouchDb.put(ETables.PURCHASE_ORDER, uuid, po as unknown as Record<string, unknown>);
        for (const item of poItems) {
          await pouchDb.put(ETables.PURCHASE_ORDER_ITEM, item.uuid, item as unknown as Record<string, unknown>);
        }

        patchState(store, { purchaseOrders: [...store.purchaseOrders(), po] });
        activityLog.log('create', 'purchase_order', po.po_no || uuid, `Amount: ${po.total_amount}`);
        return po;
      },

      async updatePurchaseOrder(uuid: string, data: Partial<IPurchaseOrder>): Promise<void> {
        const existing = store.purchaseOrders().find((po) => po.uuid === uuid);
        if (!existing) return;

        const updated: IPurchaseOrder = { ...existing, ...data, updated_at: Date.now() };
        await pouchDb.put(ETables.PURCHASE_ORDER, uuid, updated as unknown as Record<string, unknown>);
        patchState(store, {
          purchaseOrders: store.purchaseOrders().map((po) => (po.uuid === uuid ? updated : po)),
        });
        activityLog.log('update', 'purchase_order', updated.po_no || uuid, `Status: ${updated.status}`);
      },

      async deletePurchaseOrder(uuid: string): Promise<void> {
        const bizUuid = getBizUuid();
        const existing = store.purchaseOrders().find((po) => po.uuid === uuid);
        if (!existing) return;

        // Delete PO items
        const allItems = await pouchDb.findByBusiness<IPurchaseOrderItem>(ETables.PURCHASE_ORDER_ITEM, bizUuid);
        const poItems = allItems.filter((i) => i.po_uuid === uuid);
        for (const item of poItems) {
          await pouchDb.remove(ETables.PURCHASE_ORDER_ITEM, item.uuid);
        }

        await pouchDb.remove(ETables.PURCHASE_ORDER, uuid);
        patchState(store, { purchaseOrders: store.purchaseOrders().filter((po) => po.uuid !== uuid) });
        activityLog.log('delete', 'purchase_order', existing.po_no || uuid, `Amount: ${existing.total_amount}`);
      },

      async getPurchaseOrderItems(poUuid: string): Promise<IPurchaseOrderItem[]> {
        const bizUuid = getBizUuid();
        const allItems = await pouchDb.findByBusiness<IPurchaseOrderItem>(ETables.PURCHASE_ORDER_ITEM, bizUuid);
        return allItems.filter((i) => i.po_uuid === poUuid);
      },

      async updatePurchaseOrderItems(items: IPurchaseOrderItem[]): Promise<void> {
        for (const item of items) {
          await pouchDb.put(ETables.PURCHASE_ORDER_ITEM, item.uuid, item as unknown as Record<string, unknown>);
        }
      },

      async receiveGoods(
        poUuid: string,
        receivedItems: { po_item_uuid: string; item_uuid: string; ordered_quantity: number; received_quantity: number }[],
      ): Promise<IGoodsReceiptNote> {
        const bizUuid = getBizUuid();
        const po = store.purchaseOrders().find((p) => p.uuid === poUuid);
        if (!po) throw new Error('Purchase order not found');

        const now = Date.now();
        const grnUuid = crypto.randomUUID();

        // Create GRN
        const grn: IGoodsReceiptNote = {
          uuid: grnUuid,
          table_type: ETables.GOODS_RECEIPT_NOTE,
          business_uuid: bizUuid,
          branch_uuid: null,
          po_uuid: poUuid,
          grn_no: generateGRNNo(),
          grn_date: now,
          party_uuid: po.party_uuid,
          notes: null,
          total_items: receivedItems.length,
          total_quantity: receivedItems.reduce((sum, i) => sum + i.received_quantity, 0),
          created_at: now,
          updated_at: now,
          created_by: null,
          updated_by: null,
        };

        await pouchDb.put(ETables.GOODS_RECEIPT_NOTE, grnUuid, grn as unknown as Record<string, unknown>);

        // Create GRN items
        for (const ri of receivedItems) {
          const grnItem: IGoodsReceiptNoteItem = {
            uuid: crypto.randomUUID(),
            table_type: ETables.GOODS_RECEIPT_NOTE_ITEM,
            business_uuid: bizUuid,
            branch_uuid: null,
            grn_uuid: grnUuid,
            po_item_uuid: ri.po_item_uuid,
            item_uuid: ri.item_uuid,
            ordered_quantity: ri.ordered_quantity,
            received_quantity: ri.received_quantity,
            created_at: now,
            updated_at: now,
            created_by: null,
            updated_by: null,
          };
          await pouchDb.put(ETables.GOODS_RECEIPT_NOTE_ITEM, grnItem.uuid, grnItem as unknown as Record<string, unknown>);
        }

        // Update PO items received_quantity
        const allPoItems = await pouchDb.findByBusiness<IPurchaseOrderItem>(ETables.PURCHASE_ORDER_ITEM, bizUuid);
        const poItems = allPoItems.filter((i) => i.po_uuid === poUuid);

        for (const poItem of poItems) {
          const received = receivedItems.find((ri) => ri.po_item_uuid === poItem.uuid);
          if (received) {
            const updatedItem: IPurchaseOrderItem = {
              ...poItem,
              received_quantity: poItem.received_quantity + received.received_quantity,
              updated_at: now,
            };
            await pouchDb.put(ETables.PURCHASE_ORDER_ITEM, poItem.uuid, updatedItem as unknown as Record<string, unknown>);
          }
        }

        // Determine PO status: check if all items fully received
        const updatedPoItems = await pouchDb.findByBusiness<IPurchaseOrderItem>(ETables.PURCHASE_ORDER_ITEM, bizUuid);
        const currentPoItems = updatedPoItems.filter((i) => i.po_uuid === poUuid);
        const allFullyReceived = currentPoItems.every((i) => i.received_quantity >= i.quantity);
        const anyReceived = currentPoItems.some((i) => i.received_quantity > 0);

        let newStatus: IPurchaseOrder['status'] = po.status;
        if (allFullyReceived) {
          newStatus = 'received';
        } else if (anyReceived) {
          newStatus = 'partially_received';
        }

        // Update PO received_amount
        const receivedValue = receivedItems.reduce((sum, ri) => {
          const poItem = poItems.find((pi) => pi.uuid === ri.po_item_uuid);
          return sum + (poItem ? ri.received_quantity * poItem.price : 0);
        }, 0);

        const updatedPO: IPurchaseOrder = {
          ...po,
          status: newStatus,
          received_amount: po.received_amount + receivedValue,
          updated_at: now,
        };
        await pouchDb.put(ETables.PURCHASE_ORDER, poUuid, updatedPO as unknown as Record<string, unknown>);
        patchState(store, {
          purchaseOrders: store.purchaseOrders().map((p) => (p.uuid === poUuid ? updatedPO : p)),
        });

        activityLog.log('create', 'goods_receipt', grn.grn_no || grnUuid, `PO: ${po.po_no}, Items: ${grn.total_quantity}`);
        return grn;
      },

      async getGRNsForPO(poUuid: string): Promise<IGoodsReceiptNote[]> {
        const bizUuid = getBizUuid();
        const allGRNs = await pouchDb.findByBusiness<IGoodsReceiptNote>(ETables.GOODS_RECEIPT_NOTE, bizUuid);
        return allGRNs.filter((g) => g.po_uuid === poUuid);
      },

      async getGRNItems(grnUuid: string): Promise<IGoodsReceiptNoteItem[]> {
        const bizUuid = getBizUuid();
        const allItems = await pouchDb.findByBusiness<IGoodsReceiptNoteItem>(ETables.GOODS_RECEIPT_NOTE_ITEM, bizUuid);
        return allItems.filter((i) => i.grn_uuid === grnUuid);
      },

      async convertToInvoice(poUuid: string): Promise<void> {
        const bizUuid = getBizUuid();
        const po = store.purchaseOrders().find((p) => p.uuid === poUuid);
        if (!po) throw new Error('Purchase order not found');

        const poItems = await pouchDb.findByBusiness<IPurchaseOrderItem>(ETables.PURCHASE_ORDER_ITEM, bizUuid);
        const items = poItems.filter((i) => i.po_uuid === poUuid);

        // Create purchase transaction using received quantities
        const txItems = items
          .filter((i) => i.received_quantity > 0)
          .map((i) => ({
            item_uuid: i.item_uuid,
            purchase_price: i.price,
            sales_price: 0,
            quantity: i.received_quantity,
            item_wise_tax: 0,
            total_tax: 0,
          }));

        const totalAmount = txItems.reduce((sum, i) => sum + i.purchase_price * i.quantity, 0);

        const tx = await transactionStore.addTransaction(
          {
            type: ETransactionType.PURCHASE,
            party_uuid: po.party_uuid,
            transaction_mode: 'credit',
            total_amount: totalAmount - po.discount,
            paid_amount: 0,
            due_amount: totalAmount - po.discount,
            discount: po.discount,
            total_tax: po.total_tax,
            quantity: txItems.reduce((sum, i) => sum + i.quantity, 0),
            po_uuid: poUuid,
          },
          txItems,
        );

        // Update PO with converted transaction reference
        const updatedPO: IPurchaseOrder = {
          ...po,
          converted_transaction_uuid: tx.uuid,
          updated_at: Date.now(),
        };
        await pouchDb.put(ETables.PURCHASE_ORDER, poUuid, updatedPO as unknown as Record<string, unknown>);
        patchState(store, {
          purchaseOrders: store.purchaseOrders().map((p) => (p.uuid === poUuid ? updatedPO : p)),
        });

        activityLog.log('update', 'purchase_order', po.po_no || poUuid, `Converted to invoice: ${tx.invoice_no}`);
      },

      reset(): void {
        patchState(store, { ...initialState });
      },
    };
  }),
);
