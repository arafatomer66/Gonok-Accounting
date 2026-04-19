import { Component, inject, signal } from '@angular/core';
import { PouchDbService } from '../../core/services/pouchdb.service';
import { AuthStore } from '../../core/stores/auth.store';
import { CatalogStore } from '../../core/stores/catalog.store';
import { TransactionStore } from '../../core/stores/transaction.store';
import { ExpenseStore } from '../../core/stores/expense.store';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'gonok-backup',
  standalone: true,
  imports: [DatePipe],
  template: `
    <div class="page-header">
      <h1 class="page-header__title">Backup & Restore</h1>
    </div>

    <div class="backup-grid">
      <!-- Export -->
      <div class="card backup-card">
        <div class="card-icon">📥</div>
        <h3 class="card-title">Export Backup</h3>
        <p class="card-desc">Download all your business data as a JSON file. This includes products, parties, transactions, and expenses.</p>
        <button class="btn btn--primary" (click)="exportBackup()" [disabled]="exporting()">
          {{ exporting() ? 'Exporting...' : 'Download Backup' }}
        </button>
        @if (exportSuccess()) {
          <p class="success-msg">Backup downloaded successfully!</p>
        }
      </div>

      <!-- Import -->
      <div class="card backup-card">
        <div class="card-icon">📤</div>
        <h3 class="card-title">Restore Backup</h3>
        <p class="card-desc">Restore data from a previously exported JSON backup file. This will merge with existing data.</p>
        <label class="btn btn--primary file-btn">
          {{ importing() ? 'Importing...' : 'Select Backup File' }}
          <input type="file" accept=".json" (change)="importBackup($event)" [disabled]="importing()" hidden />
        </label>
        @if (importSuccess()) {
          <p class="success-msg">{{ importSuccess() }}</p>
        }
        @if (importError()) {
          <p class="error-msg">{{ importError() }}</p>
        }
      </div>
    </div>

    <!-- Backup Info -->
    <div class="card mt-4">
      <div class="card__header">
        <h3 class="card__title">Backup Information</h3>
      </div>
      <div class="card__body">
        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">Business</span>
            <span class="info-value">{{ authStore.activeBusiness()?.name_en || 'N/A' }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Last Backup</span>
            <span class="info-value">{{ lastBackup() ? (lastBackup() | date:'dd/MM/yyyy hh:mm a') : 'Never' }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Total Documents</span>
            <span class="info-value">{{ totalDocs() }}</span>
          </div>
        </div>

        <div class="backup-note">
          <strong>Note:</strong> Your data is automatically synced to the cloud via CouchDB when online.
          Manual backups provide an additional safety net for offline recovery.
        </div>
      </div>
    </div>
  `,
  styles: `
    @use '../../../styles/abstracts/variables' as *;

    .backup-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: $space-5;
      @media (max-width: 640px) { grid-template-columns: 1fr; }
    }

    .backup-card {
      padding: $space-6;
      text-align: center;
    }

    .card-icon {
      font-size: 40px;
      margin-bottom: $space-3;
    }

    .card-title {
      font-size: $font-size-lg;
      font-weight: $font-weight-bold;
      margin: 0 0 $space-2;
    }

    .card-desc {
      font-size: $font-size-sm;
      color: $color-text-secondary;
      margin: 0 0 $space-5;
      line-height: 1.5;
    }

    .file-btn {
      cursor: pointer;
      display: inline-block;
    }

    .success-msg {
      color: $color-success;
      font-size: $font-size-sm;
      margin-top: $space-3;
    }

    .error-msg {
      color: $color-danger;
      font-size: $font-size-sm;
      margin-top: $space-3;
    }

    .mt-4 { margin-top: $space-6; }

    .info-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: $space-4;
      margin-bottom: $space-4;
      @media (max-width: 640px) { grid-template-columns: 1fr; }
    }

    .info-item {
      text-align: center;
    }

    .info-label {
      display: block;
      font-size: $font-size-xs;
      color: $color-text-secondary;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: $space-1;
    }

    .info-value {
      font-size: $font-size-base;
      font-weight: $font-weight-semibold;
    }

    .backup-note {
      background: $color-gray-50;
      padding: $space-3 $space-4;
      border-radius: $radius-md;
      font-size: $font-size-sm;
      color: $color-text-secondary;
      line-height: 1.5;
    }
  `,
})
export class BackupComponent {
  private pouchDb = inject(PouchDbService);
  authStore = inject(AuthStore);
  private catalogStore = inject(CatalogStore);
  private transactionStore = inject(TransactionStore);
  private expenseStore = inject(ExpenseStore);

  exporting = signal(false);
  importing = signal(false);
  exportSuccess = signal(false);
  importSuccess = signal('');
  importError = signal('');
  lastBackup = signal<number | null>(null);
  totalDocs = signal(0);

  constructor() {
    this.countDocs();
  }

  private async countDocs(): Promise<void> {
    try {
      const db = this.pouchDb.getDatabase();
      const info = await db.info();
      this.totalDocs.set(info.doc_count);
    } catch {
      this.totalDocs.set(0);
    }
  }

  async exportBackup(): Promise<void> {
    this.exporting.set(true);
    this.exportSuccess.set(false);

    try {
      const db = this.pouchDb.getDatabase();
      const result = await db.allDocs({ include_docs: true });

      const docs = result.rows
        .filter((row) => row.doc && !row.id.startsWith('_'))
        .map((row) => {
          const doc = { ...row.doc } as any;
          delete doc._rev;
          return doc;
        });

      const backup = {
        version: 1,
        app: 'gonok',
        exported_at: Date.now(),
        business: this.authStore.activeBusiness()?.name_en || 'Unknown',
        doc_count: docs.length,
        documents: docs,
      };

      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `gonok-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);

      this.lastBackup.set(Date.now());
      this.exportSuccess.set(true);
      setTimeout(() => this.exportSuccess.set(false), 3000);
    } catch (e) {
      console.error('Backup export failed', e);
    }

    this.exporting.set(false);
  }

  async importBackup(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.importing.set(true);
    this.importSuccess.set('');
    this.importError.set('');

    try {
      const text = await file.text();
      const backup = JSON.parse(text);

      if (!backup.app || backup.app !== 'gonok') {
        this.importError.set('Invalid backup file — not a Gonok backup.');
        this.importing.set(false);
        return;
      }

      const db = this.pouchDb.getDatabase();
      let imported = 0;
      let skipped = 0;

      for (const doc of backup.documents) {
        try {
          // Try to get existing — if exists, update with _rev
          try {
            const existing = await db.get(doc._id);
            await db.put({ ...doc, _rev: existing._rev });
          } catch {
            await db.put(doc);
          }
          imported++;
        } catch {
          skipped++;
        }
      }

      // Reload stores
      this.catalogStore.reset();
      this.transactionStore.reset();
      this.expenseStore.reset();
      this.catalogStore.loadAll();
      this.transactionStore.loadAll();
      this.expenseStore.loadAll();

      this.importSuccess.set(`Restored ${imported} documents (${skipped} skipped).`);
      this.countDocs();
    } catch (e) {
      this.importError.set('Failed to parse backup file. Make sure it\'s a valid JSON.');
    }

    this.importing.set(false);
    input.value = '';
  }
}
