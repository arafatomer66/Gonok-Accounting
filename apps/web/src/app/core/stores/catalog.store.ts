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
  IProduct,
  ICategory,
  IUnit,
  IParty,
  IPartyGroup,
  ETables,
  EPartyType,
  EPartyHead,
  EPartyGroup,
} from '@org/shared-types';
import { ActivityLogService } from '../services/activity-log.service';
import { DEFAULT_UNITS } from '../../features/products/data/default-units';

interface CatalogState {
  products: IProduct[];
  categories: ICategory[];
  units: IUnit[];
  parties: IParty[];
  partyGroups: IPartyGroup[];
  loading: boolean;
  initialized: boolean;
}

const initialState: CatalogState = {
  products: [],
  categories: [],
  units: [],
  parties: [],
  partyGroups: [],
  loading: false,
  initialized: false,
};

export const CatalogStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed((store) => {
    const authStore = inject(AuthStore);
    return {
      totalStock: computed(() =>
        store.products().reduce((sum, p) => sum + (p.quantity || 0), 0),
      ),
      totalStockValue: computed(() =>
        store
          .products()
          .reduce(
            (sum, p) =>
              sum + (p.quantity || 0) * (p.purchase_price || 0),
            0,
          ),
      ),
      lowStockProducts: computed(() =>
        store.products().filter(
          (p) => p.reorder_level > 0 && p.quantity <= p.reorder_level,
        ),
      ),
      lowStockCount: computed(() =>
        store.products().filter(
          (p) => p.reorder_level > 0 && p.quantity <= p.reorder_level,
        ).length,
      ),
      customers: computed(() =>
        store
          .parties()
          .filter((p) => p.party_type === EPartyType.CUSTOMER),
      ),
      suppliers: computed(() =>
        store
          .parties()
          .filter((p) => p.party_type === EPartyType.SUPPLIER),
      ),
      allParties: computed(() => {
        const bizUuid = authStore.activeBusinessUuid();
        if (!bizUuid) return store.parties();
        const cashSale: IParty = {
          uuid: bizUuid,
          name: EPartyHead.CASH_SALE,
          business_uuid: bizUuid,
          branch_uuid: null,
          party_type: EPartyType.CUSTOMER,
          group_uuid: bizUuid,
          phone: null,
          email: null,
          address: null,
          shipping_address: null,
          tin: null,
          current_balance: 0,
          current_balance_date: 0,
          can_delete: false,
          credit_limit: 0,
          payment_terms: null,
          payment_terms_days: 0,
          table_type: ETables.PARTY,
          created_at: 0,
          updated_at: 0,
          created_by: null,
          updated_by: null,
        };
        return [cashSale, ...store.parties()];
      }),
      allPartyGroups: computed(() => {
        const bizUuid = authStore.activeBusinessUuid();
        if (!bizUuid) return store.partyGroups();
        const general: IPartyGroup = {
          uuid: bizUuid,
          name: EPartyGroup.GENERAL,
          business_uuid: bizUuid,
          branch_uuid: null,
          can_delete: false,
          table_type: ETables.PARTY_GROUP,
          created_at: 0,
          updated_at: 0,
          created_by: null,
          updated_by: null,
        };
        return [general, ...store.partyGroups()];
      }),
    };
  }),
  withMethods((store) => {
    const pouchDb = inject(PouchDbService);
    const authStore = inject(AuthStore);
    const activityLog = inject(ActivityLogService);

    function getBizUuid(): string {
      const uuid = authStore.activeBusinessUuid();
      if (!uuid) throw new Error('No active business');
      return uuid;
    }

    return {
      async loadAll(): Promise<void> {
        const bizUuid = getBizUuid();
        patchState(store, { loading: true });

        const [products, categories, units, parties, partyGroups] =
          await Promise.all([
            pouchDb.findByBusiness<IProduct>(ETables.PRODUCT, bizUuid),
            pouchDb.findByBusiness<ICategory>(ETables.CATEGORY, bizUuid),
            pouchDb.findByBusiness<IUnit>(ETables.UNIT, bizUuid),
            pouchDb.findByBusiness<IParty>(ETables.PARTY, bizUuid),
            pouchDb.findByBusiness<IPartyGroup>(
              ETables.PARTY_GROUP,
              bizUuid,
            ),
          ]);

        // Migrate products missing stock_by_branch
        for (let i = 0; i < products.length; i++) {
          if (products[i].stock_by_branch === undefined || products[i].stock_by_branch === null) {
            products[i] = { ...products[i], stock_by_branch: {} };
            await pouchDb.put(
              ETables.PRODUCT,
              products[i].uuid,
              products[i] as unknown as Record<string, unknown>,
            );
          }
        }

        // Seed default units if none exist
        if (units.length === 0) {
          const seeded: IUnit[] = [];
          for (const u of DEFAULT_UNITS) {
            const uuid = crypto.randomUUID();
            const now = Date.now();
            const unit: IUnit = {
              uuid,
              table_type: ETables.UNIT,
              business_uuid: bizUuid,
              fullname: u.fullname,
              shortname: u.shortname,
              can_delete: false,
              created_at: now,
              updated_at: now,
              created_by: null,
              updated_by: null,
            };
            await pouchDb.put(
              ETables.UNIT,
              uuid,
              unit as unknown as Record<string, unknown>,
            );
            seeded.push(unit);
          }
          patchState(store, {
            products,
            categories,
            units: seeded,
            parties,
            partyGroups,
            loading: false,
            initialized: true,
          });
        } else {
          patchState(store, {
            products,
            categories,
            units,
            parties,
            partyGroups,
            loading: false,
            initialized: true,
          });
        }
      },

      // ─── Product CRUD ──────────────────────────────
      async addProduct(
        data: Partial<IProduct>,
      ): Promise<IProduct> {
        const bizUuid = getBizUuid();
        const uuid = crypto.randomUUID();
        const now = Date.now();
        const product: IProduct = {
          uuid,
          table_type: ETables.PRODUCT,
          business_uuid: bizUuid,
          branch_uuid: null,
          name: data.name ?? null,
          code: data.code ?? null,
          product_type: data.product_type ?? 'product',
          active: data.active ?? true,
          slug: null,
          description: data.description ?? null,
          purchase_price: data.purchase_price ?? 0,
          sales_price: data.sales_price ?? 0,
          mrp_price: data.mrp_price ?? 0,
          discount: data.discount ?? 0,
          net_price: data.net_price ?? 0,
          stock_count: data.stock_count ?? 0,
          image_url: null,
          thumbnail_url: null,
          unit: data.unit ?? null,
          category_uuid: data.category_uuid ?? null,
          party_wise_rate: null,
          item_wise_tax: data.item_wise_tax ?? 0,
          quantity: data.stock_count ?? 0,
          stock_by_branch: data.stock_by_branch ?? {},
          batch_no: data.batch_no ?? null,
          exp_date: data.exp_date ?? null,
          mfg_date: data.mfg_date ?? null,
          serial_no: data.serial_no ?? null,
          size: null,
          reorder_level: data.reorder_level ?? 0,
          reorder_quantity: data.reorder_quantity ?? 0,
          created_at: now,
          updated_at: now,
          created_by: null,
          updated_by: null,
        };
        await pouchDb.put(
          ETables.PRODUCT,
          uuid,
          product as unknown as Record<string, unknown>,
        );
        patchState(store, { products: [...store.products(), product] });
        activityLog.log('create', 'product', product.name || uuid);
        return product;
      },

      async updateProduct(
        uuid: string,
        changes: Partial<IProduct>,
      ): Promise<IProduct> {
        const products = store.products();
        const existing = products.find((p) => p.uuid === uuid);
        if (!existing) throw new Error('Product not found');
        const updated: IProduct = {
          ...existing,
          ...changes,
          updated_at: Date.now(),
        };
        await pouchDb.put(
          ETables.PRODUCT,
          uuid,
          updated as unknown as Record<string, unknown>,
        );
        patchState(store, {
          products: products.map((p) =>
            p.uuid === uuid ? updated : p,
          ),
        });
        return updated;
      },

      async updateBranchStock(
        productUuid: string,
        branchUuid: string,
        delta: number,
      ): Promise<void> {
        const product = store.products().find((p) => p.uuid === productUuid);
        if (!product) return;
        const stockByBranch = { ...(product.stock_by_branch ?? {}) };
        stockByBranch[branchUuid] = (stockByBranch[branchUuid] ?? 0) + delta;
        const quantity = Object.values(stockByBranch).reduce((s, v) => s + v, 0);
        await this.updateProduct(productUuid, { stock_by_branch: stockByBranch, quantity });
      },

      async deleteProduct(uuid: string): Promise<void> {
        const product = store.products().find((p) => p.uuid === uuid);
        await pouchDb.remove(ETables.PRODUCT, uuid);
        patchState(store, {
          products: store.products().filter((p) => p.uuid !== uuid),
        });
        activityLog.log('delete', 'product', product?.name || uuid);
      },

      // ─── Category CRUD ─────────────────────────────
      async addCategory(
        data: Partial<ICategory>,
      ): Promise<ICategory> {
        const bizUuid = getBizUuid();
        const uuid = crypto.randomUUID();
        const now = Date.now();
        const category: ICategory = {
          uuid,
          table_type: ETables.CATEGORY,
          business_uuid: bizUuid,
          branch_uuid: null,
          name: data.name ?? null,
          comment: null,
          is_supplier: false,
          is_outlet: false,
          is_enabled: true,
          created_at: now,
          updated_at: now,
          created_by: null,
          updated_by: null,
        };
        await pouchDb.put(
          ETables.CATEGORY,
          uuid,
          category as unknown as Record<string, unknown>,
        );
        patchState(store, {
          categories: [...store.categories(), category],
        });
        return category;
      },

      async deleteCategory(uuid: string): Promise<void> {
        await pouchDb.remove(ETables.CATEGORY, uuid);
        patchState(store, {
          categories: store.categories().filter((c) => c.uuid !== uuid),
        });
      },

      // ─── Unit CRUD ─────────────────────────────────
      async addUnit(data: Partial<IUnit>): Promise<IUnit> {
        const bizUuid = getBizUuid();
        const uuid = crypto.randomUUID();
        const now = Date.now();
        const unit: IUnit = {
          uuid,
          table_type: ETables.UNIT,
          business_uuid: bizUuid,
          fullname: data.fullname ?? null,
          shortname: data.shortname ?? null,
          can_delete: true,
          created_at: now,
          updated_at: now,
          created_by: null,
          updated_by: null,
        };
        await pouchDb.put(
          ETables.UNIT,
          uuid,
          unit as unknown as Record<string, unknown>,
        );
        patchState(store, { units: [...store.units(), unit] });
        return unit;
      },

      async deleteUnit(uuid: string): Promise<void> {
        await pouchDb.remove(ETables.UNIT, uuid);
        patchState(store, {
          units: store.units().filter((u) => u.uuid !== uuid),
        });
      },

      // ─── Party CRUD ────────────────────────────────
      async addParty(data: Partial<IParty>): Promise<IParty> {
        const bizUuid = getBizUuid();
        const uuid = crypto.randomUUID();
        const now = Date.now();
        const party: IParty = {
          uuid,
          table_type: ETables.PARTY,
          business_uuid: bizUuid,
          branch_uuid: null,
          name: data.name ?? null,
          party_type: data.party_type ?? EPartyType.CUSTOMER,
          group_uuid: data.group_uuid ?? bizUuid,
          phone: data.phone ?? null,
          email: data.email ?? null,
          address: data.address ?? null,
          shipping_address: data.shipping_address ?? null,
          tin: data.tin ?? null,
          current_balance: data.current_balance ?? 0,
          current_balance_date: data.current_balance_date ?? 0,
          can_delete: true,
          credit_limit: data.credit_limit ?? 0,
          payment_terms: data.payment_terms ?? null,
          payment_terms_days: data.payment_terms_days ?? 0,
          created_at: now,
          updated_at: now,
          created_by: null,
          updated_by: null,
        };
        await pouchDb.put(
          ETables.PARTY,
          uuid,
          party as unknown as Record<string, unknown>,
        );
        patchState(store, { parties: [...store.parties(), party] });
        activityLog.log('create', 'party', party.name || uuid, `Type: ${party.party_type}`);
        return party;
      },

      async updateParty(
        uuid: string,
        changes: Partial<IParty>,
      ): Promise<IParty> {
        const parties = store.parties();
        const existing = parties.find((p) => p.uuid === uuid);
        if (!existing) throw new Error('Party not found');
        const updated: IParty = {
          ...existing,
          ...changes,
          updated_at: Date.now(),
        };
        await pouchDb.put(
          ETables.PARTY,
          uuid,
          updated as unknown as Record<string, unknown>,
        );
        patchState(store, {
          parties: parties.map((p) =>
            p.uuid === uuid ? updated : p,
          ),
        });
        return updated;
      },

      async deleteParty(uuid: string): Promise<void> {
        const party = store.parties().find((p) => p.uuid === uuid);
        await pouchDb.remove(ETables.PARTY, uuid);
        patchState(store, {
          parties: store.parties().filter((p) => p.uuid !== uuid),
        });
        activityLog.log('delete', 'party', party?.name || uuid);
      },

      // ─── PartyGroup CRUD ───────────────────────────
      async addPartyGroup(
        data: Partial<IPartyGroup>,
      ): Promise<IPartyGroup> {
        const bizUuid = getBizUuid();
        const uuid = crypto.randomUUID();
        const now = Date.now();
        const group: IPartyGroup = {
          uuid,
          table_type: ETables.PARTY_GROUP,
          business_uuid: bizUuid,
          branch_uuid: null,
          name: data.name ?? null,
          can_delete: true,
          created_at: now,
          updated_at: now,
          created_by: null,
          updated_by: null,
        };
        await pouchDb.put(
          ETables.PARTY_GROUP,
          uuid,
          group as unknown as Record<string, unknown>,
        );
        patchState(store, {
          partyGroups: [...store.partyGroups(), group],
        });
        return group;
      },

      async deletePartyGroup(uuid: string): Promise<void> {
        await pouchDb.remove(ETables.PARTY_GROUP, uuid);
        patchState(store, {
          partyGroups: store
            .partyGroups()
            .filter((g) => g.uuid !== uuid),
        });
      },

      checkCreditLimit(partyUuid: string, additionalAmount: number): { allowed: boolean; limit: number; currentBalance: number } {
        const party = store.parties().find((p) => p.uuid === partyUuid);
        if (!party || !party.credit_limit || party.credit_limit <= 0) {
          return { allowed: true, limit: 0, currentBalance: party?.current_balance ?? 0 };
        }
        const newBalance = party.current_balance + additionalAmount;
        return {
          allowed: newBalance <= party.credit_limit,
          limit: party.credit_limit,
          currentBalance: party.current_balance,
        };
      },

      /** Reset catalog on business switch */
      reset(): void {
        patchState(store, { ...initialState });
      },
    };
  }),
);
