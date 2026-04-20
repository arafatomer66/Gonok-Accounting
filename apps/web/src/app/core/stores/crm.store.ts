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
  ICrmInteraction,
  ICrmOpportunity,
  ICrmNote,
  ETables,
  ECrmInteractionType,
  ECrmOpportunityStage,
} from '@org/shared-types';

interface CrmState {
  interactions: ICrmInteraction[];
  opportunities: ICrmOpportunity[];
  notes: ICrmNote[];
  loading: boolean;
  initialized: boolean;
}

const initialState: CrmState = {
  interactions: [],
  opportunities: [],
  notes: [],
  loading: false,
  initialized: false,
};

export const CrmStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed((store) => {
    const startOfToday = () => {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    };

    return {
      upcomingFollowups: computed(() =>
        store
          .interactions()
          .filter(
            (i) =>
              i.next_followup_date != null &&
              !i.followup_completed &&
              i.next_followup_date >= startOfToday(),
          )
          .sort((a, b) => a.next_followup_date! - b.next_followup_date!),
      ),

      overdueFollowups: computed(() =>
        store
          .interactions()
          .filter(
            (i) =>
              i.next_followup_date != null &&
              !i.followup_completed &&
              i.next_followup_date < startOfToday(),
          )
          .sort((a, b) => a.next_followup_date! - b.next_followup_date!),
      ),

      pipelineByStage: computed(() => {
        const stages: Record<
          string,
          { opportunities: ICrmOpportunity[]; totalValue: number }
        > = {};
        for (const stage of Object.values(ECrmOpportunityStage)) {
          const opps = store
            .opportunities()
            .filter((o) => o.stage === stage);
          stages[stage] = {
            opportunities: opps,
            totalValue: opps.reduce((s, o) => s + o.estimated_value, 0),
          };
        }
        return stages;
      }),

      pinnedNotes: computed(() =>
        store.notes().filter((n) => n.is_pinned),
      ),

      totalPipelineValue: computed(() =>
        store
          .opportunities()
          .filter(
            (o) =>
              o.stage !== ECrmOpportunityStage.LOST &&
              o.stage !== ECrmOpportunityStage.WON,
          )
          .reduce((s, o) => s + o.estimated_value, 0),
      ),
    };
  }),
  withMethods((store) => {
    const pouchDb = inject(PouchDbService);
    const authStore = inject(AuthStore);

    function getBizUuid(): string {
      const uuid = authStore.activeBusinessUuid();
      if (!uuid) throw new Error('No active business');
      return uuid;
    }

    return {
      async loadAll(): Promise<void> {
        const bizUuid = getBizUuid();
        patchState(store, { loading: true });

        const [interactions, opportunities, notes] = await Promise.all([
          pouchDb.findByBusiness<ICrmInteraction>(
            ETables.CRM_INTERACTION,
            bizUuid,
          ),
          pouchDb.findByBusiness<ICrmOpportunity>(
            ETables.CRM_OPPORTUNITY,
            bizUuid,
          ),
          pouchDb.findByBusiness<ICrmNote>(ETables.CRM_NOTE, bizUuid),
        ]);

        patchState(store, {
          interactions,
          opportunities,
          notes,
          loading: false,
          initialized: true,
        });
      },

      // ─── Interactions ───────────────────────────────
      async addInteraction(
        data: Partial<ICrmInteraction>,
      ): Promise<ICrmInteraction> {
        const bizUuid = getBizUuid();
        const uuid = crypto.randomUUID();
        const now = Date.now();
        const interaction: ICrmInteraction = {
          uuid,
          table_type: ETables.CRM_INTERACTION,
          business_uuid: bizUuid,
          branch_uuid: null,
          party_uuid: data.party_uuid!,
          interaction_type:
            data.interaction_type ?? ECrmInteractionType.CALL,
          subject: data.subject ?? null,
          description: data.description ?? null,
          interaction_date: data.interaction_date ?? now,
          duration_minutes: data.duration_minutes ?? 0,
          next_followup_date: data.next_followup_date ?? null,
          followup_completed: false,
          created_at: now,
          updated_at: now,
          created_by: null,
          updated_by: null,
        };
        await pouchDb.put(
          ETables.CRM_INTERACTION,
          uuid,
          interaction as unknown as Record<string, unknown>,
        );
        patchState(store, {
          interactions: [...store.interactions(), interaction],
        });
        return interaction;
      },

      async updateInteraction(
        uuid: string,
        changes: Partial<ICrmInteraction>,
      ): Promise<void> {
        const existing = store.interactions().find((i) => i.uuid === uuid);
        if (!existing) return;
        const updated: ICrmInteraction = {
          ...existing,
          ...changes,
          updated_at: Date.now(),
        };
        await pouchDb.put(
          ETables.CRM_INTERACTION,
          uuid,
          updated as unknown as Record<string, unknown>,
        );
        patchState(store, {
          interactions: store
            .interactions()
            .map((i) => (i.uuid === uuid ? updated : i)),
        });
      },

      async deleteInteraction(uuid: string): Promise<void> {
        await pouchDb.remove(ETables.CRM_INTERACTION, uuid);
        patchState(store, {
          interactions: store.interactions().filter((i) => i.uuid !== uuid),
        });
      },

      async completeFollowup(uuid: string): Promise<void> {
        const existing = store.interactions().find((i) => i.uuid === uuid);
        if (!existing) return;
        const updated: ICrmInteraction = {
          ...existing,
          followup_completed: true,
          updated_at: Date.now(),
        };
        await pouchDb.put(
          ETables.CRM_INTERACTION,
          uuid,
          updated as unknown as Record<string, unknown>,
        );
        patchState(store, {
          interactions: store
            .interactions()
            .map((i) => (i.uuid === uuid ? updated : i)),
        });
      },

      // ─── Opportunities ─────────────────────────────
      async addOpportunity(
        data: Partial<ICrmOpportunity>,
      ): Promise<ICrmOpportunity> {
        const bizUuid = getBizUuid();
        const uuid = crypto.randomUUID();
        const now = Date.now();
        const opportunity: ICrmOpportunity = {
          uuid,
          table_type: ETables.CRM_OPPORTUNITY,
          business_uuid: bizUuid,
          branch_uuid: null,
          party_uuid: data.party_uuid!,
          title: data.title ?? '',
          stage: data.stage ?? ECrmOpportunityStage.LEAD,
          estimated_value: data.estimated_value ?? 0,
          probability: data.probability ?? 0,
          expected_close_date: data.expected_close_date ?? null,
          notes: data.notes ?? null,
          created_at: now,
          updated_at: now,
          created_by: null,
          updated_by: null,
        };
        await pouchDb.put(
          ETables.CRM_OPPORTUNITY,
          uuid,
          opportunity as unknown as Record<string, unknown>,
        );
        patchState(store, {
          opportunities: [...store.opportunities(), opportunity],
        });
        return opportunity;
      },

      async updateOpportunity(
        uuid: string,
        changes: Partial<ICrmOpportunity>,
      ): Promise<void> {
        const existing = store.opportunities().find((o) => o.uuid === uuid);
        if (!existing) return;
        const updated: ICrmOpportunity = {
          ...existing,
          ...changes,
          updated_at: Date.now(),
        };
        await pouchDb.put(
          ETables.CRM_OPPORTUNITY,
          uuid,
          updated as unknown as Record<string, unknown>,
        );
        patchState(store, {
          opportunities: store
            .opportunities()
            .map((o) => (o.uuid === uuid ? updated : o)),
        });
      },

      async deleteOpportunity(uuid: string): Promise<void> {
        await pouchDb.remove(ETables.CRM_OPPORTUNITY, uuid);
        patchState(store, {
          opportunities: store
            .opportunities()
            .filter((o) => o.uuid !== uuid),
        });
      },

      // ─── Notes ──────────────────────────────────────
      async addNote(data: Partial<ICrmNote>): Promise<ICrmNote> {
        const bizUuid = getBizUuid();
        const uuid = crypto.randomUUID();
        const now = Date.now();
        const note: ICrmNote = {
          uuid,
          table_type: ETables.CRM_NOTE,
          business_uuid: bizUuid,
          branch_uuid: null,
          party_uuid: data.party_uuid!,
          content: data.content ?? '',
          is_pinned: data.is_pinned ?? false,
          created_at: now,
          updated_at: now,
          created_by: null,
          updated_by: null,
        };
        await pouchDb.put(
          ETables.CRM_NOTE,
          uuid,
          note as unknown as Record<string, unknown>,
        );
        patchState(store, { notes: [...store.notes(), note] });
        return note;
      },

      async updateNote(
        uuid: string,
        changes: Partial<ICrmNote>,
      ): Promise<void> {
        const existing = store.notes().find((n) => n.uuid === uuid);
        if (!existing) return;
        const updated: ICrmNote = {
          ...existing,
          ...changes,
          updated_at: Date.now(),
        };
        await pouchDb.put(
          ETables.CRM_NOTE,
          uuid,
          updated as unknown as Record<string, unknown>,
        );
        patchState(store, {
          notes: store
            .notes()
            .map((n) => (n.uuid === uuid ? updated : n)),
        });
      },

      async deleteNote(uuid: string): Promise<void> {
        await pouchDb.remove(ETables.CRM_NOTE, uuid);
        patchState(store, {
          notes: store.notes().filter((n) => n.uuid !== uuid),
        });
      },

      async toggleNotePin(uuid: string): Promise<void> {
        const existing = store.notes().find((n) => n.uuid === uuid);
        if (!existing) return;
        const updated: ICrmNote = {
          ...existing,
          is_pinned: !existing.is_pinned,
          updated_at: Date.now(),
        };
        await pouchDb.put(
          ETables.CRM_NOTE,
          uuid,
          updated as unknown as Record<string, unknown>,
        );
        patchState(store, {
          notes: store
            .notes()
            .map((n) => (n.uuid === uuid ? updated : n)),
        });
      },

      reset(): void {
        patchState(store, { ...initialState });
      },
    };
  }),
);
