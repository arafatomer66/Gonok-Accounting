import { computed, inject } from '@angular/core';
import {
  signalStore,
  withState,
  withComputed,
  withMethods,
  patchState,
} from '@ngrx/signals';
import { StorageService } from '../services/storage.service';
import { PouchDbService } from '../services/pouchdb.service';

export interface AuthUser {
  uuid: string;
  name: string;
  phone: string;
}

export interface Business {
  uuid: string;
  name_en: string | null;
  name_bn: string | null;
  phone: string | null;
}

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  businesses: Business[];
  activeBusinessUuid: string | null;
  loading: boolean;
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  businesses: [],
  activeBusinessUuid: null,
  loading: false,
};

export const AuthStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed((store) => ({
    activeBusiness: computed(() => {
      const uuid = store.activeBusinessUuid();
      return store.businesses().find((b) => b.uuid === uuid) || null;
    }),
  })),
  withMethods((store) => {
    const storage = inject(StorageService);
    const pouchDb = inject(PouchDbService);

    return {
      /** Restore session from localStorage on app init */
      restoreSession(): void {
        const user = storage.getUser();
        const token = storage.getAccessToken();
        if (user && token) {
          patchState(store, {
            user,
            isAuthenticated: true,
            activeBusinessUuid: storage.getActiveBusinessUuid(),
          });
          pouchDb.init(user.uuid);
        }
      },

      /** Set auth after successful OTP verification */
      setAuth(user: AuthUser, accessToken: string, refreshToken: string): void {
        storage.setUser(user);
        storage.setTokens(accessToken, refreshToken);
        patchState(store, { user, isAuthenticated: true });
        pouchDb.init(user.uuid);
      },

      /** Set businesses list */
      setBusinesses(businesses: Business[]): void {
        patchState(store, { businesses });
        // Auto-select first if no active
        if (!store.activeBusinessUuid() && businesses.length > 0) {
          const uuid = storage.getActiveBusinessUuid() || businesses[0].uuid;
          patchState(store, { activeBusinessUuid: uuid });
          storage.setActiveBusinessUuid(uuid);
        }
      },

      /** Switch active business */
      switchBusiness(uuid: string): void {
        patchState(store, { activeBusinessUuid: uuid });
        storage.setActiveBusinessUuid(uuid);
      },

      /** Logout */
      logout(): void {
        storage.clearAll();
        pouchDb.close();
        patchState(store, { ...initialState });
      },

      setLoading(loading: boolean): void {
        patchState(store, { loading });
      },

      updateUser(user: AuthUser): void {
        patchState(store, { user });
      },

      updateBusiness(uuid: string, data: Partial<Business>): void {
        const businesses = store.businesses().map((b) =>
          b.uuid === uuid ? { ...b, ...data } : b,
        );
        patchState(store, { businesses });
      },
    };
  }),
);
