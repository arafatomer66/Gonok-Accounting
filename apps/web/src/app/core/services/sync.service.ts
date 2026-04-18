import { Injectable, signal, inject } from '@angular/core';
import PouchDB from 'pouchdb-browser';
import { PouchDbService } from './pouchdb.service';
import { ConnectionService } from './connection.service';

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'paused' | 'error' | 'offline';

@Injectable({ providedIn: 'root' })
export class SyncService {
  private pouchDb = inject(PouchDbService);
  private connection = inject(ConnectionService);

  private syncHandler: PouchDB.Replication.Sync<Record<string, unknown>> | null = null;
  private remoteDb: PouchDB.Database | null = null;

  readonly status = signal<SyncStatus>('idle');
  readonly lastSyncTime = signal<number | null>(null);

  /** Start sync with CouchDB remote */
  async startSync(couchDbUrl: string, username: string, password: string): Promise<void> {
    this.stopSync();

    const remoteUrl = `${couchDbUrl}`;
    this.remoteDb = new PouchDB(remoteUrl, {
      auth: { username, password },
    } as PouchDB.Configuration.RemoteDatabaseConfiguration);

    const localDb = this.pouchDb.getDatabase();

    // Phase 1: Initial one-time sync (with timeout so offline doesn't block)
    this.status.set('syncing');
    try {
      const syncPromise = localDb.sync(this.remoteDb, { live: false, retry: false });
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Sync timeout')), 5000),
      );
      await Promise.race([syncPromise, timeoutPromise]);
      this.lastSyncTime.set(Date.now());
    } catch (err) {
      console.warn('[Sync] Initial sync failed, continuing offline:', err);
    }

    // Phase 2: Continuous live sync
    this.startLiveSync(localDb);
  }

  private startLiveSync(localDb: PouchDB.Database): void {
    if (!this.remoteDb) return;

    this.syncHandler = localDb.sync(this.remoteDb, {
      live: true,
      retry: true,
    });

    this.syncHandler
      .on('change', (change) => {
        this.status.set('syncing');
        this.lastSyncTime.set(Date.now());
        this.handleChange(change);
      })
      .on('paused', () => {
        // Paused = caught up or offline
        this.status.set(this.connection.isOnline() ? 'synced' : 'offline');
      })
      .on('active', () => {
        this.status.set('syncing');
      })
      .on('error', (err) => {
        console.error('[Sync] Error:', err);
        this.status.set('error');
      })
      .on('denied', (err) => {
        console.error('[Sync] Denied:', err);
      });
  }

  /** Handle incoming change from CouchDB */
  private handleChange(change: PouchDB.Replication.SyncResult<Record<string, unknown>>): void {
    if (change.direction !== 'pull') return;
    if (!change.change.ok) return;

    // Pull changes will be picked up by signal stores that watch PouchDB
    // Each feature store can subscribe to PouchDB changes feed independently
    const docs = change.change.docs;
    console.log(`[Sync] Pulled ${docs.length} doc(s)`);
  }

  /** Stop sync */
  stopSync(): void {
    if (this.syncHandler) {
      this.syncHandler.cancel();
      this.syncHandler = null;
    }
    if (this.remoteDb) {
      this.remoteDb.close();
      this.remoteDb = null;
    }
    this.status.set('idle');
  }
}
