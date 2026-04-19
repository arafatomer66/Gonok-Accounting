import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { CatalogStore } from '../../core/stores/catalog.store';
import { ActivityLogService } from '../../core/services/activity-log.service';
import * as XLSX from 'xlsx';

type ImportType = 'products' | 'parties';


@Component({
  selector: 'gonok-import',
  standalone: true,
  imports: [FormsModule, DecimalPipe],
  template: `
    <div class="page-header">
      <h1 class="page-header__title">Import Data</h1>
    </div>

    <!-- Import Type Selection -->
    <div class="import-tabs">
      <button class="import-tab" [class.import-tab--active]="importType() === 'products'" (click)="importType.set('products')">
        Products
      </button>
      <button class="import-tab" [class.import-tab--active]="importType() === 'parties'" (click)="importType.set('parties')">
        Parties
      </button>
    </div>

    <div class="card import-card">
      <!-- Instructions -->
      <div class="import-instructions">
        <h4>Excel Format</h4>
        @if (importType() === 'products') {
          <p>Your Excel file should have these columns:</p>
          <div class="table-wrapper">
            <table class="table table--sm">
              <thead>
                <tr>
                  <th>Name *</th>
                  <th>Code</th>
                  <th>Category</th>
                  <th>Purchase Price *</th>
                  <th>Sales Price *</th>
                  <th>Stock</th>
                  <th>Unit</th>
                </tr>
              </thead>
              <tbody>
                <tr class="example-row">
                  <td>Rice (Miniket)</td>
                  <td>P001</td>
                  <td>Grocery</td>
                  <td>50</td>
                  <td>55</td>
                  <td>100</td>
                  <td>Kilogram</td>
                </tr>
              </tbody>
            </table>
          </div>
        } @else {
          <p>Your Excel file should have these columns:</p>
          <div class="table-wrapper">
            <table class="table table--sm">
              <thead>
                <tr>
                  <th>Name *</th>
                  <th>Type * (customer/supplier)</th>
                  <th>Phone</th>
                  <th>Address</th>
                  <th>Opening Balance</th>
                </tr>
              </thead>
              <tbody>
                <tr class="example-row">
                  <td>Rahim Store</td>
                  <td>customer</td>
                  <td>01712345678</td>
                  <td>Dhaka</td>
                  <td>5000</td>
                </tr>
              </tbody>
            </table>
          </div>
        }
        <div class="import-actions">
          <button class="btn btn--ghost btn--sm" (click)="downloadTemplate()">Download Template</button>
          <label class="btn btn--primary file-btn">
            Select Excel File (.xlsx)
            <input type="file" accept=".xlsx,.xls,.csv" (change)="onFileSelect($event)" hidden />
          </label>
        </div>
      </div>

      <!-- Preview -->
      @if (previewRows().length > 0) {
        <div class="preview-section">
          <h4>Preview ({{ previewRows().length }} rows)</h4>

          @if (importType() === 'products') {
            <div class="table-wrapper">
              <table class="table table--sm">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Name</th>
                    <th>Code</th>
                    <th class="text-right">Purchase</th>
                    <th class="text-right">Sales</th>
                    <th class="text-right">Stock</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  @for (row of previewRows(); track $index; let i = $index) {
                    <tr [class.row-error]="row._error">
                      <td>{{ i + 1 }}</td>
                      <td>{{ row.name }}</td>
                      <td>{{ row.code || '-' }}</td>
                      <td class="text-right">{{ row.purchase_price | number:'1.2-2' }}</td>
                      <td class="text-right">{{ row.sales_price | number:'1.2-2' }}</td>
                      <td class="text-right">{{ row.stock || 0 }}</td>
                      <td>
                        @if (row._error) {
                          <span class="badge badge--danger">{{ row._error }}</span>
                        } @else {
                          <span class="badge badge--success">OK</span>
                        }
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          } @else {
            <div class="table-wrapper">
              <table class="table table--sm">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Name</th>
                    <th>Type</th>
                    <th>Phone</th>
                    <th class="text-right">Balance</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  @for (row of previewRows(); track $index; let i = $index) {
                    <tr [class.row-error]="row._error">
                      <td>{{ i + 1 }}</td>
                      <td>{{ row.name }}</td>
                      <td>{{ row.type }}</td>
                      <td>{{ row.phone || '-' }}</td>
                      <td class="text-right">{{ row.opening_balance || 0 | number:'1.2-2' }}</td>
                      <td>
                        @if (row._error) {
                          <span class="badge badge--danger">{{ row._error }}</span>
                        } @else {
                          <span class="badge badge--success">OK</span>
                        }
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }

          <div class="preview-footer">
            <p class="preview-stats">
              Valid: {{ validCount() }} &middot; Errors: {{ errorCount() }}
            </p>
            <div class="preview-btns">
              <button class="btn btn--ghost" (click)="clearPreview()">Cancel</button>
              <button class="btn btn--primary" (click)="doImport()" [disabled]="importing() || validCount() === 0">
                {{ importing() ? 'Importing...' : 'Import ' + validCount() + ' Records' }}
              </button>
            </div>
          </div>
        </div>
      }

      @if (importResult()) {
        <p class="success-msg">{{ importResult() }}</p>
      }
    </div>
  `,
  styles: `
    @use '../../../styles/abstracts/variables' as *;

    .import-tabs {
      display: flex;
      gap: $space-2;
      margin-bottom: $space-5;
    }

    .import-tab {
      padding: $space-2 $space-5;
      border: 1px solid $color-border;
      border-radius: $radius-lg;
      background: transparent;
      cursor: pointer;
      font-weight: $font-weight-medium;
      font-size: $font-size-sm;
      transition: all 150ms ease;

      &--active {
        background: $color-primary;
        color: white;
        border-color: $color-primary;
      }
    }

    .import-card {
      padding: $space-6;
    }

    .import-instructions {
      h4 { margin: 0 0 $space-2; font-size: $font-size-base; }
      p { font-size: $font-size-sm; color: $color-text-secondary; margin: 0 0 $space-3; }
    }

    .example-row td {
      color: $color-text-secondary;
      font-style: italic;
      font-size: $font-size-sm;
    }

    .import-actions {
      display: flex;
      gap: $space-3;
      margin-top: $space-4;
    }

    .file-btn {
      cursor: pointer;
      display: inline-block;
    }

    .preview-section {
      margin-top: $space-6;
      border-top: 1px solid $color-border;
      padding-top: $space-5;

      h4 { margin: 0 0 $space-3; }
    }

    .table--sm {
      font-size: $font-size-sm;
      th, td { padding: $space-2 $space-3; }
    }

    .text-right { text-align: right; }

    .row-error {
      background: rgba($color-danger, 0.04);
    }

    .preview-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: $space-4;
    }

    .preview-stats {
      font-size: $font-size-sm;
      color: $color-text-secondary;
      margin: 0;
    }

    .preview-btns {
      display: flex;
      gap: $space-2;
    }

    .success-msg {
      color: $color-success;
      font-size: $font-size-sm;
      margin-top: $space-4;
      font-weight: $font-weight-medium;
    }
  `,
})
export class ImportComponent {
  private catalogStore = inject(CatalogStore);
  private activityLog = inject(ActivityLogService);

  importType = signal<ImportType>('products');
  previewRows = signal<any[]>([]);
  importing = signal(false);
  importResult = signal('');

  validCount = signal(0);
  errorCount = signal(0);

  downloadTemplate(): void {
    const wb = XLSX.utils.book_new();
    let ws: XLSX.WorkSheet;

    if (this.importType() === 'products') {
      ws = XLSX.utils.aoa_to_sheet([
        ['Name', 'Code', 'Category', 'Purchase Price', 'Sales Price', 'Stock', 'Unit'],
        ['Sample Product', 'P001', 'General', 100, 120, 50, 'Piece'],
      ]);
    } else {
      ws = XLSX.utils.aoa_to_sheet([
        ['Name', 'Type', 'Phone', 'Address', 'Opening Balance'],
        ['Sample Customer', 'customer', '01712345678', 'Dhaka', 0],
      ]);
    }

    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, `gonok-${this.importType()}-template.xlsx`);
  }

  onFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      const wb = XLSX.read(data, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws) as Record<string, any>[];

      if (this.importType() === 'products') {
        this.parseProducts(rows);
      } else {
        this.parseParties(rows);
      }
    };
    reader.readAsArrayBuffer(file);
    input.value = '';
  }

  private parseProducts(rows: Record<string, any>[]): void {
    const existingNames = new Set(this.catalogStore.products().map((p) => (p.name || '').toLowerCase()));
    let valid = 0;
    let errors = 0;

    const parsed = rows.map((row) => {
      const name = String(row['Name'] || row['name'] || '').trim();
      const r: any = {
        name,
        code: String(row['Code'] || row['code'] || '').trim(),
        category: String(row['Category'] || row['category'] || '').trim(),
        purchase_price: Number(row['Purchase Price'] || row['purchase_price'] || 0),
        sales_price: Number(row['Sales Price'] || row['sales_price'] || 0),
        stock: Number(row['Stock'] || row['stock'] || 0),
        unit: String(row['Unit'] || row['unit'] || '').trim(),
        _error: null as string | null,
      };

      if (!name) r._error = 'Name required';
      else if (existingNames.has(name.toLowerCase())) r._error = 'Duplicate';
      else if (r.purchase_price < 0 || r.sales_price < 0) r._error = 'Invalid price';

      if (r._error) errors++;
      else valid++;

      return r;
    });

    this.previewRows.set(parsed);
    this.validCount.set(valid);
    this.errorCount.set(errors);
  }

  private parseParties(rows: Record<string, any>[]): void {
    const existingNames = new Set(this.catalogStore.parties().map((p) => (p.name || '').toLowerCase()));
    let valid = 0;
    let errors = 0;

    const parsed = rows.map((row) => {
      const name = String(row['Name'] || row['name'] || '').trim();
      const type = String(row['Type'] || row['type'] || '').trim().toLowerCase();
      const r: any = {
        name,
        type,
        phone: String(row['Phone'] || row['phone'] || '').trim(),
        address: String(row['Address'] || row['address'] || '').trim(),
        opening_balance: Number(row['Opening Balance'] || row['opening_balance'] || 0),
        _error: null as string | null,
      };

      if (!name) r._error = 'Name required';
      else if (!['customer', 'supplier'].includes(type)) r._error = 'Type must be customer/supplier';
      else if (existingNames.has(name.toLowerCase())) r._error = 'Duplicate';

      if (r._error) errors++;
      else valid++;

      return r;
    });

    this.previewRows.set(parsed);
    this.validCount.set(valid);
    this.errorCount.set(errors);
  }

  clearPreview(): void {
    this.previewRows.set([]);
    this.importResult.set('');
  }

  async doImport(): Promise<void> {
    this.importing.set(true);
    this.importResult.set('');

    const validRows = this.previewRows().filter((r) => !r._error);
    let count = 0;

    if (this.importType() === 'products') {
      for (const row of validRows) {
        await this.catalogStore.addProduct({
          name: row.name,
          code: row.code || null,
          purchase_price: row.purchase_price,
          sales_price: row.sales_price,
          stock_count: row.stock,
          quantity: row.stock,
        });
        count++;
      }
    } else {
      for (const row of validRows) {
        await this.catalogStore.addParty({
          name: row.name,
          party_type: row.type,
          phone: row.phone || null,
          address: row.address || null,
          current_balance: row.opening_balance || 0,
        });
        count++;
      }
    }

    this.activityLog.log('create', 'import', `${this.importType()} import`, `Imported ${count} records from Excel`);
    this.importResult.set(`Successfully imported ${count} ${this.importType()}.`);
    this.previewRows.set([]);
    this.importing.set(false);
  }
}
