import { Injectable, signal, computed } from '@angular/core';
import PouchDB from 'pouchdb-browser';

@Injectable({ providedIn: 'root' })
export class PouchDbService {
  private db: PouchDB.Database | null = null;
  private _dbName = signal<string | null>(null);

  readonly isInitialized = computed(() => !!this._dbName());

  /** Initialize (or re-initialize) the local database for a user */
  init(userUuid: string): void {
    if (this.db) {
      this.db.close();
    }
    const name = `gonok-${userUuid}`;
    this.db = new PouchDB(name);
    this._dbName.set(name);
    console.log(`[PouchDB] Initialized: ${name}`);
  }

  /** Close the database */
  async close(): Promise<void> {
    if (this.db) {
      await this.db.close();
      this.db = null;
      this._dbName.set(null);
    }
  }

  /** Get the raw PouchDB instance (for sync) */
  getDatabase(): PouchDB.Database {
    if (!this.db) throw new Error('PouchDB not initialized');
    return this.db;
  }

  // ─── Document ID helpers ────────────────────────────
  buildKey(tableType: string, uuid: string): string {
    return `${tableType}::${uuid}`;
  }

  parseKey(id: string): { tableType: string; uuid: string } {
    const [tableType, uuid] = id.split('::');
    return { tableType, uuid };
  }

  // ─── CRUD operations ───────────────────────────────
  async put<T extends Record<string, unknown>>(tableType: string, uuid: string, doc: T): Promise<PouchDB.Core.Response> {
    if (!this.db) throw new Error('PouchDB not initialized');
    const _id = this.buildKey(tableType, uuid);

    // Try to get existing doc for _rev
    try {
      const existing = await this.db.get(_id);
      return this.db.put({ ...doc, _id, _rev: existing._rev });
    } catch {
      return this.db.put({ ...doc, _id });
    }
  }

  async get<T>(tableType: string, uuid: string): Promise<T & PouchDB.Core.IdMeta & PouchDB.Core.GetMeta> {
    if (!this.db) throw new Error('PouchDB not initialized');
    const _id = this.buildKey(tableType, uuid);
    return this.db.get(_id) as Promise<T & PouchDB.Core.IdMeta & PouchDB.Core.GetMeta>;
  }

  async remove(tableType: string, uuid: string): Promise<PouchDB.Core.Response> {
    if (!this.db) throw new Error('PouchDB not initialized');
    const _id = this.buildKey(tableType, uuid);
    const doc = await this.db.get(_id);
    return this.db.remove(doc);
  }

  /** Find documents by conditions (requires pouchdb-find plugin or allDocs filter) */
  async find<T>(conditions: Record<string, unknown>): Promise<T[]> {
    if (!this.db) throw new Error('PouchDB not initialized');

    const tableType = conditions['table_type'] as string;
    if (!tableType) throw new Error('table_type required for find()');

    const result = await this.db.allDocs({
      include_docs: true,
      startkey: `${tableType}::`,
      endkey: `${tableType}::\ufff0`,
    });

    let docs = result.rows
      .map((row) => row.doc as unknown as T & Record<string, unknown>)
      .filter((doc) => doc && !('_deleted' in doc && doc['_deleted']));

    // Apply additional filters
    for (const [key, value] of Object.entries(conditions)) {
      if (key === 'table_type') continue;
      docs = docs.filter((doc) => doc[key] === value);
    }

    return docs as T[];
  }

  /** Get all documents of a table type for a specific business */
  async findByBusiness<T>(tableType: string, businessUuid: string): Promise<T[]> {
    return this.find<T>({ table_type: tableType, business_uuid: businessUuid });
  }
}
