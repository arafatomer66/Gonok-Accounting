import { Injectable, inject } from '@angular/core';
import { PouchDbService } from './pouchdb.service';
import { AuthStore } from '../stores/auth.store';
import { ETables } from '@org/shared-types';

export interface IActivityLog {
  uuid: string;
  table_type: string;
  business_uuid: string;
  user_name: string;
  action: 'create' | 'update' | 'delete';
  entity_type: string;
  entity_name: string;
  details: string | null;
  timestamp: number;
}

@Injectable({ providedIn: 'root' })
export class ActivityLogService {
  private pouchDb = inject(PouchDbService);
  private authStore = inject(AuthStore);

  async log(action: IActivityLog['action'], entityType: string, entityName: string, details?: string): Promise<void> {
    const bizUuid = this.authStore.activeBusiness()?.uuid;
    if (!bizUuid) return;

    const entry: IActivityLog = {
      uuid: crypto.randomUUID(),
      table_type: ETables.ACTIVITY_LOG,
      business_uuid: bizUuid,
      user_name: this.authStore.user()?.name || 'Unknown',
      action,
      entity_type: entityType,
      entity_name: entityName,
      details: details || null,
      timestamp: Date.now(),
    };

    await this.pouchDb.put(ETables.ACTIVITY_LOG, entry.uuid, entry as unknown as Record<string, unknown>);
  }

  async getAll(): Promise<IActivityLog[]> {
    const bizUuid = this.authStore.activeBusiness()?.uuid;
    if (!bizUuid) return [];
    const docs = await this.pouchDb.findByBusiness<IActivityLog>(ETables.ACTIVITY_LOG, bizUuid);
    return docs.sort((a, b) => b.timestamp - a.timestamp);
  }
}
