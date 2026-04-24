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
import { IBranch, ETables } from '@org/shared-types';
import { ActivityLogService } from '../services/activity-log.service';

const ACTIVE_BRANCH_KEY = 'gonok_active_branch';

interface BranchState {
  branches: IBranch[];
  activeBranchUuid: string | null;
  loading: boolean;
  initialized: boolean;
}

const initialState: BranchState = {
  branches: [],
  activeBranchUuid: null,
  loading: false,
  initialized: false,
};

export const BranchStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed((store) => ({
    activeBranch: computed(() =>
      store.branches().find((b) => b.uuid === store.activeBranchUuid()) ?? null,
    ),
    hasBranches: computed(() => store.branches().length > 0),
    mainBranch: computed(() =>
      store.branches().find((b) => b.is_main) ?? null,
    ),
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

    return {
      async loadAll(): Promise<void> {
        const bizUuid = getBizUuid();
        patchState(store, { loading: true });
        const branches = await pouchDb.findByBusiness<IBranch>(
          ETables.BRANCH,
          bizUuid,
        );
        // Sort: main branch first
        branches.sort((a, b) => (b.is_main ? 1 : 0) - (a.is_main ? 1 : 0));

        // Restore active branch from localStorage
        let activeBranchUuid = localStorage.getItem(ACTIVE_BRANCH_KEY);
        if (!activeBranchUuid || !branches.find((b) => b.uuid === activeBranchUuid)) {
          // Default to main branch or first branch
          const main = branches.find((b) => b.is_main);
          activeBranchUuid = main?.uuid ?? branches[0]?.uuid ?? null;
        }

        patchState(store, {
          branches,
          activeBranchUuid,
          loading: false,
          initialized: true,
        });
      },

      setActiveBranch(uuid: string): void {
        localStorage.setItem(ACTIVE_BRANCH_KEY, uuid);
        patchState(store, { activeBranchUuid: uuid });
      },

      async addBranch(
        data: Partial<IBranch>,
      ): Promise<IBranch> {
        const bizUuid = getBizUuid();
        const uuid = crypto.randomUUID();
        const now = Date.now();

        const branch: IBranch = {
          uuid,
          table_type: ETables.BRANCH,
          business_uuid: bizUuid,
          name: data.name ?? '',
          address: data.address ?? null,
          phone: data.phone ?? null,
          is_main: data.is_main ?? false,
          created_at: now,
          updated_at: now,
          created_by: null,
          updated_by: null,
        };

        // If setting as main, unset others
        if (branch.is_main) {
          for (const b of store.branches()) {
            if (b.is_main) {
              const updated = { ...b, is_main: false, updated_at: now };
              await pouchDb.put(
                ETables.BRANCH,
                b.uuid,
                updated as unknown as Record<string, unknown>,
              );
            }
          }
        }

        await pouchDb.put(
          ETables.BRANCH,
          uuid,
          branch as unknown as Record<string, unknown>,
        );
        activityLog.log('create', 'branch', branch.name);

        const branches = [...store.branches(), branch].sort(
          (a, b) => (b.is_main ? 1 : 0) - (a.is_main ? 1 : 0),
        );
        patchState(store, { branches });

        // Auto-select if first branch
        if (branches.length === 1) {
          localStorage.setItem(ACTIVE_BRANCH_KEY, uuid);
          patchState(store, { activeBranchUuid: uuid });
        }

        return branch;
      },

      async updateBranch(
        uuid: string,
        changes: Partial<IBranch>,
      ): Promise<void> {
        const now = Date.now();
        const existing = store.branches().find((b) => b.uuid === uuid);
        if (!existing) return;

        // If setting as main, unset others
        if (changes.is_main) {
          for (const b of store.branches()) {
            if (b.is_main && b.uuid !== uuid) {
              const updated = { ...b, is_main: false, updated_at: now };
              await pouchDb.put(
                ETables.BRANCH,
                b.uuid,
                updated as unknown as Record<string, unknown>,
              );
            }
          }
        }

        const updated: IBranch = { ...existing, ...changes, updated_at: now };
        await pouchDb.put(
          ETables.BRANCH,
          uuid,
          updated as unknown as Record<string, unknown>,
        );
        activityLog.log('update', 'branch', updated.name);

        const branches = store
          .branches()
          .map((b) => {
            if (b.uuid === uuid) return updated;
            if (changes.is_main && b.is_main) return { ...b, is_main: false, updated_at: now };
            return b;
          })
          .sort((a, b) => (b.is_main ? 1 : 0) - (a.is_main ? 1 : 0));
        patchState(store, { branches });
      },

      async deleteBranch(uuid: string): Promise<void> {
        const branch = store.branches().find((b) => b.uuid === uuid);
        if (!branch) return;

        await pouchDb.remove(ETables.BRANCH, uuid);
        activityLog.log('delete', 'branch', branch.name);

        const branches = store.branches().filter((b) => b.uuid !== uuid);
        patchState(store, { branches });

        // If we deleted the active branch, switch to main or first
        if (store.activeBranchUuid() === uuid) {
          const main = branches.find((b) => b.is_main);
          const newActive = main?.uuid ?? branches[0]?.uuid ?? null;
          if (newActive) {
            localStorage.setItem(ACTIVE_BRANCH_KEY, newActive);
          } else {
            localStorage.removeItem(ACTIVE_BRANCH_KEY);
          }
          patchState(store, { activeBranchUuid: newActive });
        }
      },

      reset(): void {
        patchState(store, initialState);
      },
    };
  }),
);
