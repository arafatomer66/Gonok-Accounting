import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiService } from './api.service';
import { SyncService } from './sync.service';

interface SyncCredentials {
  url: string;
  username: string;
  password: string;
  database: string;
}

@Injectable({ providedIn: 'root' })
export class SyncBootstrapService {
  private api = inject(ApiService);
  private syncService = inject(SyncService);

  /**
   * Fetch CouchDB credentials from backend and perform initial sync.
   * Returns a promise that resolves after the initial pull is complete,
   * so callers can wait before loading stores.
   */
  async start(): Promise<boolean> {
    try {
      const creds = await firstValueFrom(
        this.api.get<SyncCredentials>('/sync/credentials'),
      );
      await this.syncService.startSync(creds.url, creds.username, creds.password);
      console.log('[SyncBootstrap] Initial sync complete');
      return true;
    } catch (err) {
      console.warn('[SyncBootstrap] Failed:', (err as Error).message);
      // App still works offline via PouchDB
      return false;
    }
  }

  stop(): void {
    this.syncService.stopSync();
  }
}
