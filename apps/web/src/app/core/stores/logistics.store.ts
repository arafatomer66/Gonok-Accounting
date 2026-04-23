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
  IVehicle,
  ITrip,
  ITripStop,
  ETables,
  EVehicleStatus,
  ETripStatus,
} from '@org/shared-types';
import { ActivityLogService } from '../services/activity-log.service';

interface LogisticsState {
  vehicles: IVehicle[];
  trips: ITrip[];
  loading: boolean;
  initialized: boolean;
}

const initialState: LogisticsState = {
  vehicles: [],
  trips: [],
  loading: false,
  initialized: false,
};

export const LogisticsStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed((store) => ({
    activeVehicles: computed(() =>
      store.vehicles().filter((v) => v.status === EVehicleStatus.ACTIVE),
    ),
    maintenanceVehicles: computed(() =>
      store.vehicles().filter((v) => v.status === EVehicleStatus.MAINTENANCE),
    ),
    plannedTrips: computed(() =>
      store.trips().filter((t) => t.status === ETripStatus.PLANNED),
    ),
    activeTrips: computed(() =>
      store.trips().filter((t) => t.status === ETripStatus.IN_PROGRESS),
    ),
    completedTrips: computed(() =>
      store.trips().filter((t) => t.status === ETripStatus.COMPLETED),
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
        const [vehicles, trips] = await Promise.all([
          pouchDb.findByBusiness<IVehicle>(ETables.VEHICLE, bizUuid),
          pouchDb.findByBusiness<ITrip>(ETables.TRIP, bizUuid),
        ]);
        patchState(store, { vehicles, trips, loading: false, initialized: true });
      },

      // ─── Vehicle CRUD ──────────────────────────────
      async addVehicle(data: Partial<IVehicle>): Promise<IVehicle> {
        const bizUuid = getBizUuid();
        const uuid = crypto.randomUUID();
        const now = Date.now();
        const vehicle: IVehicle = {
          uuid,
          table_type: ETables.VEHICLE,
          business_uuid: bizUuid,
          branch_uuid: null,
          name: data.name ?? '',
          plate_number: data.plate_number ?? '',
          vehicle_type: data.vehicle_type ?? null,
          capacity: data.capacity ?? null,
          driver_name: data.driver_name ?? null,
          driver_phone: data.driver_phone ?? null,
          status: data.status ?? EVehicleStatus.ACTIVE,
          notes: data.notes ?? null,
          created_at: now,
          updated_at: now,
          created_by: null,
          updated_by: null,
        };
        await pouchDb.put(ETables.VEHICLE, uuid, vehicle as unknown as Record<string, unknown>);
        patchState(store, { vehicles: [...store.vehicles(), vehicle] });
        activityLog.log('create', 'vehicle', vehicle.name, `Plate: ${vehicle.plate_number}`);
        return vehicle;
      },

      async updateVehicle(uuid: string, data: Partial<IVehicle>): Promise<void> {
        const existing = store.vehicles().find((v) => v.uuid === uuid);
        if (!existing) return;
        const updated: IVehicle = { ...existing, ...data, updated_at: Date.now() };
        await pouchDb.put(ETables.VEHICLE, uuid, updated as unknown as Record<string, unknown>);
        patchState(store, {
          vehicles: store.vehicles().map((v) => (v.uuid === uuid ? updated : v)),
        });
        activityLog.log('update', 'vehicle', existing.name);
      },

      async deleteVehicle(uuid: string): Promise<void> {
        const existing = store.vehicles().find((v) => v.uuid === uuid);
        await pouchDb.remove(ETables.VEHICLE, uuid);
        patchState(store, { vehicles: store.vehicles().filter((v) => v.uuid !== uuid) });
        activityLog.log('delete', 'vehicle', existing?.name || uuid);
      },

      // ─── Trip CRUD ──────────────────────────────────
      async addTrip(data: Partial<ITrip>, stops: Partial<ITripStop>[]): Promise<ITrip> {
        const bizUuid = getBizUuid();
        const uuid = crypto.randomUUID();
        const now = Date.now();
        const trip: ITrip = {
          uuid,
          table_type: ETables.TRIP,
          business_uuid: bizUuid,
          branch_uuid: null,
          trip_no: `TRP-${Date.now().toString(36).toUpperCase()}`,
          vehicle_uuid: data.vehicle_uuid ?? null,
          vehicle_name: data.vehicle_name ?? null,
          driver_name: data.driver_name ?? null,
          driver_phone: data.driver_phone ?? null,
          trip_date: data.trip_date ?? now,
          start_time: null,
          end_time: null,
          status: ETripStatus.PLANNED,
          origin: data.origin ?? null,
          destination: data.destination ?? null,
          total_stops: stops.length,
          total_deliveries: stops.filter((s) => s.delivery_uuid).length,
          notes: data.notes ?? null,
          created_at: now,
          updated_at: now,
          created_by: null,
          updated_by: null,
        };

        const tripStops: ITripStop[] = stops.map((s, i) => ({
          uuid: crypto.randomUUID(),
          table_type: ETables.TRIP_STOP,
          business_uuid: bizUuid,
          trip_uuid: uuid,
          delivery_uuid: s.delivery_uuid ?? null,
          party_name: s.party_name ?? null,
          address: s.address ?? null,
          stop_order: s.stop_order ?? i + 1,
          status: 'pending' as const,
          arrived_at: null,
          notes: s.notes ?? null,
          created_at: now,
          updated_at: now,
          created_by: null,
          updated_by: null,
        }));

        await pouchDb.put(ETables.TRIP, uuid, trip as unknown as Record<string, unknown>);
        for (const stop of tripStops) {
          await pouchDb.put(ETables.TRIP_STOP, stop.uuid, stop as unknown as Record<string, unknown>);
        }

        patchState(store, { trips: [...store.trips(), trip] });
        activityLog.log('create', 'trip', trip.trip_no, `${trip.total_stops} stops`);
        return trip;
      },

      async startTrip(uuid: string): Promise<void> {
        const existing = store.trips().find((t) => t.uuid === uuid);
        if (!existing || existing.status !== ETripStatus.PLANNED) return;
        const updated: ITrip = {
          ...existing,
          status: ETripStatus.IN_PROGRESS,
          start_time: Date.now(),
          updated_at: Date.now(),
        };
        await pouchDb.put(ETables.TRIP, uuid, updated as unknown as Record<string, unknown>);
        patchState(store, {
          trips: store.trips().map((t) => (t.uuid === uuid ? updated : t)),
        });
        activityLog.log('update', 'trip', existing.trip_no, 'Started');
      },

      async completeTrip(uuid: string): Promise<void> {
        const existing = store.trips().find((t) => t.uuid === uuid);
        if (!existing || existing.status !== ETripStatus.IN_PROGRESS) return;
        const updated: ITrip = {
          ...existing,
          status: ETripStatus.COMPLETED,
          end_time: Date.now(),
          updated_at: Date.now(),
        };
        await pouchDb.put(ETables.TRIP, uuid, updated as unknown as Record<string, unknown>);
        patchState(store, {
          trips: store.trips().map((t) => (t.uuid === uuid ? updated : t)),
        });
        activityLog.log('update', 'trip', existing.trip_no, 'Completed');
      },

      async cancelTrip(uuid: string): Promise<void> {
        const existing = store.trips().find((t) => t.uuid === uuid);
        if (!existing) return;
        const updated: ITrip = {
          ...existing,
          status: ETripStatus.CANCELLED,
          updated_at: Date.now(),
        };
        await pouchDb.put(ETables.TRIP, uuid, updated as unknown as Record<string, unknown>);
        patchState(store, {
          trips: store.trips().map((t) => (t.uuid === uuid ? updated : t)),
        });
        activityLog.log('update', 'trip', existing.trip_no, 'Cancelled');
      },

      async updateTripStop(stopUuid: string, data: Partial<ITripStop>): Promise<void> {
        const bizUuid = getBizUuid();
        const allStops = await pouchDb.findByBusiness<ITripStop>(ETables.TRIP_STOP, bizUuid);
        const existing = allStops.find((s) => s.uuid === stopUuid);
        if (!existing) return;
        const updated: ITripStop = { ...existing, ...data, updated_at: Date.now() };
        await pouchDb.put(ETables.TRIP_STOP, stopUuid, updated as unknown as Record<string, unknown>);
      },

      async getTripStops(tripUuid: string): Promise<ITripStop[]> {
        const bizUuid = getBizUuid();
        const allStops = await pouchDb.findByBusiness<ITripStop>(ETables.TRIP_STOP, bizUuid);
        return allStops.filter((s) => s.trip_uuid === tripUuid).sort((a, b) => a.stop_order - b.stop_order);
      },

      async deleteTrip(uuid: string): Promise<void> {
        const bizUuid = getBizUuid();
        const existing = store.trips().find((t) => t.uuid === uuid);
        if (!existing) return;

        const allStops = await pouchDb.findByBusiness<ITripStop>(ETables.TRIP_STOP, bizUuid);
        const stops = allStops.filter((s) => s.trip_uuid === uuid);
        for (const stop of stops) {
          await pouchDb.remove(ETables.TRIP_STOP, stop.uuid);
        }

        await pouchDb.remove(ETables.TRIP, uuid);
        patchState(store, { trips: store.trips().filter((t) => t.uuid !== uuid) });
        activityLog.log('delete', 'trip', existing.trip_no);
      },

      reset(): void {
        patchState(store, { ...initialState });
      },
    };
  }),
);
