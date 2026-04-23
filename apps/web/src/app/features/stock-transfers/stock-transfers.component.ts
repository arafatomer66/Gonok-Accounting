import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DecimalPipe, DatePipe } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { StockTransferStore } from '../../core/stores/stock-transfer.store';
import { CatalogStore } from '../../core/stores/catalog.store';
import { AuthStore } from '../../core/stores/auth.store';
import { PouchDbService } from '../../core/services/pouchdb.service';
import { SearchInputComponent } from '../../shared/components/search-input/search-input.component';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import {
  IStockTransfer,
  IStockTransferItem,
  ETables,
} from '@org/shared-types';

interface IBranch {
  uuid: string;
  table_type: string;
  business_uuid: string;
  name: string;
  address: string | null;
  phone: string | null;
  is_main: boolean;
  created_at: number;
  updated_at: number;
}

interface FormItem {
  item_uuid: string;
  item_name: string;
  quantity: number;
  unit: string;
  available: number;
}

@Component({
  selector: 'gonok-stock-transfers',
  standalone: true,
  imports: [
    FormsModule,
    DecimalPipe,
    DatePipe,
    TranslateModule,
    SearchInputComponent,
    ConfirmDialogComponent,
  ],
  styleUrl: './stock-transfers.component.scss',
  template: `
    <div class="page-header">
      <h1 class="page-header__title">{{ 'stock_transfer.title' | translate }}</h1>
      <button class="btn btn--primary" (click)="openForm()">+ {{ 'stock_transfer.new' | translate }}</button>
    </div>

    <!-- Status Tabs -->
    <div class="status-tabs">
      @for (tab of statusTabs; track tab.key) {
        <button
          class="status-tab"
          [class.status-tab--active]="activeTab() === tab.key"
          (click)="activeTab.set(tab.key)"
        >
          {{ tab.label | translate }}
          <span class="status-tab__count">{{ getTabCount(tab.key) }}</span>
        </button>
      }
    </div>

    <!-- Summary Cards -->
    <div class="summary-cards">
      <div class="summary-card">
        <div class="summary-card__label">{{ 'stock_transfer.draft' | translate }}</div>
        <div class="summary-card__value">{{ transferStore.draftTransfers().length }}</div>
      </div>
      <div class="summary-card">
        <div class="summary-card__label">{{ 'stock_transfer.in_transit' | translate }}</div>
        <div class="summary-card__value summary-card__value--warning">{{ transferStore.inTransitTransfers().length }}</div>
      </div>
      <div class="summary-card">
        <div class="summary-card__label">{{ 'stock_transfer.received' | translate }}</div>
        <div class="summary-card__value summary-card__value--success">{{ transferStore.completedTransfers().length }}</div>
      </div>
      <div class="summary-card">
        <div class="summary-card__label">{{ 'base.total' | translate }}</div>
        <div class="summary-card__value">{{ transferStore.transfers().length }}</div>
      </div>
    </div>

    <!-- Search -->
    <gonok-search-input
      [placeholder]="'stock_transfer.title' | translate"
      (searchChange)="searchTerm.set($event)"
    />

    <!-- Table -->
    <div class="table-wrapper">
      <table class="table">
        <thead>
          <tr>
            <th>{{ 'stock_transfer.transfer_no' | translate }}</th>
            <th>{{ 'base.date' | translate }}</th>
            <th>{{ 'stock_transfer.from_branch' | translate }}</th>
            <th>{{ 'stock_transfer.to_branch' | translate }}</th>
            <th class="text-right">{{ 'stock_transfer.items' | translate }}</th>
            <th>{{ 'stock_transfer.status' | translate }}</th>
            <th>{{ 'base.action' | translate }}</th>
          </tr>
        </thead>
        <tbody>
          @for (transfer of filteredTransfers(); track transfer.uuid) {
            <tr>
              <td class="text-mono">{{ transfer.transfer_no }}</td>
              <td>{{ transfer.transfer_date | date:'dd/MM/yyyy' }}</td>
              <td>{{ transfer.from_branch_name }}</td>
              <td>{{ transfer.to_branch_name }}</td>
              <td class="text-right">{{ transfer.total_items }} ({{ transfer.total_quantity }})</td>
              <td>
                <span class="badge" [class]="'badge ' + getStatusClass(transfer.status)">
                  {{ 'stock_transfer.' + transfer.status | translate }}
                </span>
              </td>
              <td>
                <div class="action-btns">
                  @if (transfer.status === 'draft') {
                    <button class="btn btn--sm btn--ghost" (click)="editTransfer(transfer)">{{ 'base.edit' | translate }}</button>
                    <button class="btn btn--sm btn--primary" (click)="confirmDispatch(transfer)">{{ 'stock_transfer.dispatch' | translate }}</button>
                    <button class="btn btn--sm btn--ghost btn--danger-text" (click)="confirmDelete(transfer)">Delete</button>
                  }
                  @if (transfer.status === 'in_transit') {
                    <button class="btn btn--sm btn--primary" (click)="confirmReceive(transfer)">{{ 'stock_transfer.receive' | translate }}</button>
                    <button class="btn btn--sm btn--ghost btn--danger-text" (click)="confirmCancel(transfer)">{{ 'base.cancel' | translate }}</button>
                  }
                  @if (transfer.status === 'received' || transfer.status === 'cancelled') {
                    <button class="btn btn--sm btn--ghost" (click)="viewTransfer(transfer)">{{ 'base.details' | translate }}</button>
                  }
                </div>
              </td>
            </tr>
          } @empty {
            <tr>
              <td colspan="7" class="text-center text-muted">{{ 'stock_transfer.no_transfers' | translate }}</td>
            </tr>
          }
        </tbody>
      </table>
    </div>

    <!-- Transfer Form Modal -->
    @if (showForm()) {
      <div class="modal-backdrop" (click)="closeForm()">
        <div class="modal modal--wide" (click)="$event.stopPropagation()">
          <div class="modal__header">
            <h3 class="modal__title">
              {{ (editingTransfer() ? 'stock_transfer.edit' : 'stock_transfer.new') | translate }}
            </h3>
            <button class="modal__close" (click)="closeForm()">&times;</button>
          </div>
          <div class="modal__body">
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">{{ 'stock_transfer.from_branch' | translate }} *</label>
                <select class="form-input" [(ngModel)]="formFromBranch" name="fromBranch">
                  <option value="">-- {{ 'base.select' | translate }} --</option>
                  @for (branch of branches(); track branch.uuid) {
                    <option [value]="branch.uuid">{{ branch.name }}</option>
                  }
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">{{ 'stock_transfer.to_branch' | translate }} *</label>
                <select class="form-input" [(ngModel)]="formToBranch" name="toBranch">
                  <option value="">-- {{ 'base.select' | translate }} --</option>
                  @for (branch of branches(); track branch.uuid) {
                    <option [value]="branch.uuid">{{ branch.name }}</option>
                  }
                </select>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">{{ 'stock_transfer.transfer_date' | translate }}</label>
                <input class="form-input" type="date" [(ngModel)]="formDate" name="transferDate" />
              </div>
              <div class="form-group">
                <label class="form-label">{{ 'stock_transfer.notes' | translate }}</label>
                <input class="form-input" type="text" [(ngModel)]="formNotes" name="notes" placeholder="Optional notes" />
              </div>
            </div>

            <!-- Add Item -->
            <div class="form-group">
              <label class="form-label">{{ 'stock_transfer.items' | translate }}</label>
              <div class="item-add-row">
                <select class="form-input" [(ngModel)]="addItemUuid" name="addItem">
                  <option value="">-- Select Product --</option>
                  @for (product of catalogStore.products(); track product.uuid) {
                    <option [value]="product.uuid">{{ product.name }} (Stock: {{ product.quantity }})</option>
                  }
                </select>
                <input class="form-input item-qty-input" type="number" [(ngModel)]="addItemQty" name="addQty" min="1" placeholder="Qty" />
                <button class="btn btn--primary btn--sm" type="button" (click)="addItem()">+</button>
              </div>
            </div>

            @if (formItems.length > 0) {
              <div class="table-wrapper">
                <table class="table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th class="text-right">Qty</th>
                      <th>Unit</th>
                      <th class="text-right">Available</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (item of formItems; track item.item_uuid; let i = $index) {
                      <tr>
                        <td>{{ item.item_name }}</td>
                        <td class="text-right">
                          <input class="form-input form-input--inline" type="number" [(ngModel)]="item.quantity" [name]="'qty_' + i" min="1" />
                        </td>
                        <td>{{ item.unit || '-' }}</td>
                        <td class="text-right">{{ item.available }}</td>
                        <td>
                          <button class="btn btn--sm btn--ghost btn--danger-text" (click)="removeItem(i)">&times;</button>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }

            @if (formError()) {
              <p class="form-error">{{ formError() }}</p>
            }
          </div>
          <div class="modal__footer">
            <button class="btn btn--ghost" (click)="closeForm()">{{ 'base.cancel' | translate }}</button>
            <div class="modal__footer-right">
              <button class="btn btn--ghost" (click)="saveTransfer(false)" [disabled]="saving()">
                {{ 'stock_transfer.save_draft' | translate }}
              </button>
              <button class="btn btn--primary" (click)="saveTransfer(true)" [disabled]="saving()">
                {{ 'stock_transfer.save_dispatch' | translate }}
              </button>
            </div>
          </div>
        </div>
      </div>
    }

    <!-- View Modal (read-only) -->
    @if (viewingTransfer()) {
      <div class="modal-backdrop" (click)="viewingTransfer.set(null)">
        <div class="modal modal--wide" (click)="$event.stopPropagation()">
          <div class="modal__header">
            <h3 class="modal__title">{{ viewingTransfer()!.transfer_no }}</h3>
            <button class="modal__close" (click)="viewingTransfer.set(null)">&times;</button>
          </div>
          <div class="modal__body">
            <div class="detail-grid">
              <div><strong>{{ 'stock_transfer.from_branch' | translate }}:</strong> {{ viewingTransfer()!.from_branch_name }}</div>
              <div><strong>{{ 'stock_transfer.to_branch' | translate }}:</strong> {{ viewingTransfer()!.to_branch_name }}</div>
              <div><strong>{{ 'base.date' | translate }}:</strong> {{ viewingTransfer()!.transfer_date | date:'dd/MM/yyyy' }}</div>
              <div><strong>{{ 'stock_transfer.status' | translate }}:</strong> {{ viewingTransfer()!.status }}</div>
              @if (viewingTransfer()!.received_date) {
                <div><strong>Received:</strong> {{ viewingTransfer()!.received_date | date:'dd/MM/yyyy' }}</div>
              }
              @if (viewingTransfer()!.notes) {
                <div class="detail-full"><strong>{{ 'stock_transfer.notes' | translate }}:</strong> {{ viewingTransfer()!.notes }}</div>
              }
            </div>

            @if (viewItems().length > 0) {
              <div class="table-wrapper mt-3">
                <table class="table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th class="text-right">Qty</th>
                      <th>Unit</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (item of viewItems(); track item.uuid) {
                      <tr>
                        <td>{{ item.item_name }}</td>
                        <td class="text-right">{{ item.quantity }}</td>
                        <td>{{ item.unit || '-' }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </div>
          <div class="modal__footer">
            <button class="btn btn--ghost" (click)="viewingTransfer.set(null)">{{ 'base.back' | translate }}</button>
          </div>
        </div>
      </div>
    }

    <!-- Confirm Dialogs -->
    <gonok-confirm-dialog
      [visible]="confirmAction() !== null"
      [title]="confirmTitle()"
      [message]="confirmMessage()"
      [variant]="confirmVariant()"
      (confirmed)="onConfirmed()"
      (cancelled)="confirmAction.set(null)"
    />
  `,
})
export class StockTransfersComponent implements OnInit {
  transferStore = inject(StockTransferStore);
  catalogStore = inject(CatalogStore);
  private authStore = inject(AuthStore);
  private pouchDb = inject(PouchDbService);

  branches = signal<IBranch[]>([]);
  searchTerm = signal('');
  activeTab = signal<string>('all');
  showForm = signal(false);
  editingTransfer = signal<IStockTransfer | null>(null);
  viewingTransfer = signal<IStockTransfer | null>(null);
  viewItems = signal<IStockTransferItem[]>([]);
  saving = signal(false);
  formError = signal('');

  // Confirm dialog
  confirmAction = signal<{ type: string; transfer: IStockTransfer } | null>(null);
  confirmTitle = signal('');
  confirmMessage = signal('');
  confirmVariant = signal<'primary' | 'danger'>('primary');

  // Form fields
  formFromBranch = '';
  formToBranch = '';
  formDate = new Date().toISOString().split('T')[0];
  formNotes = '';
  formItems: FormItem[] = [];
  addItemUuid = '';
  addItemQty = 1;

  statusTabs = [
    { key: 'all', label: 'base.total' },
    { key: 'draft', label: 'stock_transfer.draft' },
    { key: 'in_transit', label: 'stock_transfer.in_transit' },
    { key: 'received', label: 'stock_transfer.received' },
    { key: 'cancelled', label: 'stock_transfer.cancelled' },
  ];

  filteredTransfers = computed(() => {
    let transfers = this.transferStore.transfers();
    const tab = this.activeTab();
    if (tab !== 'all') {
      transfers = transfers.filter((t) => t.status === tab);
    }
    const term = this.searchTerm().toLowerCase();
    if (term) {
      transfers = transfers.filter(
        (t) =>
          t.transfer_no.toLowerCase().includes(term) ||
          t.from_branch_name.toLowerCase().includes(term) ||
          t.to_branch_name.toLowerCase().includes(term),
      );
    }
    return [...transfers].sort((a, b) => b.created_at - a.created_at);
  });

  async ngOnInit(): Promise<void> {
    if (!this.catalogStore.initialized()) this.catalogStore.loadAll();
    if (!this.transferStore.initialized()) this.transferStore.loadAll();
    await this.loadBranches();
  }

  private async loadBranches(): Promise<void> {
    const bizUuid = this.authStore.activeBusinessUuid();
    if (!bizUuid) return;
    const branches = await this.pouchDb.findByBusiness<IBranch>(ETables.BRANCH, bizUuid);
    this.branches.set(branches);
  }

  getTabCount(key: string): number {
    if (key === 'all') return this.transferStore.transfers().length;
    return this.transferStore.transfers().filter((t) => t.status === key).length;
  }

  getStatusClass(status: string): string {
    const map: Record<string, string> = {
      draft: 'badge--secondary',
      in_transit: 'badge--warning',
      received: 'badge--success',
      cancelled: 'badge--danger',
    };
    return map[status] || '';
  }

  openForm(): void {
    this.editingTransfer.set(null);
    this.formFromBranch = '';
    this.formToBranch = '';
    this.formDate = new Date().toISOString().split('T')[0];
    this.formNotes = '';
    this.formItems = [];
    this.formError.set('');
    this.showForm.set(true);
  }

  async editTransfer(transfer: IStockTransfer): Promise<void> {
    this.editingTransfer.set(transfer);
    this.formFromBranch = transfer.from_branch_uuid;
    this.formToBranch = transfer.to_branch_uuid;
    this.formDate = new Date(transfer.transfer_date).toISOString().split('T')[0];
    this.formNotes = transfer.notes || '';
    this.formError.set('');

    const items = await this.transferStore.getTransferItems(transfer.uuid);
    this.formItems = items.map((item) => {
      const product = this.catalogStore.products().find((p) => p.uuid === item.item_uuid);
      return {
        item_uuid: item.item_uuid,
        item_name: item.item_name || product?.name || 'Unknown',
        quantity: item.quantity,
        unit: item.unit || product?.unit || '',
        available: product?.quantity ?? 0,
      };
    });

    this.showForm.set(true);
  }

  async viewTransfer(transfer: IStockTransfer): Promise<void> {
    const items = await this.transferStore.getTransferItems(transfer.uuid);
    this.viewItems.set(items);
    this.viewingTransfer.set(transfer);
  }

  closeForm(): void {
    this.showForm.set(false);
    this.editingTransfer.set(null);
  }

  addItem(): void {
    if (!this.addItemUuid) return;
    if (this.formItems.some((i) => i.item_uuid === this.addItemUuid)) return;

    const product = this.catalogStore.products().find((p) => p.uuid === this.addItemUuid);
    if (!product) return;

    this.formItems = [
      ...this.formItems,
      {
        item_uuid: product.uuid,
        item_name: product.name || 'Unknown',
        quantity: this.addItemQty || 1,
        unit: product.unit || '',
        available: product.quantity,
      },
    ];
    this.addItemUuid = '';
    this.addItemQty = 1;
  }

  removeItem(index: number): void {
    this.formItems = this.formItems.filter((_, i) => i !== index);
  }

  async saveTransfer(dispatch: boolean): Promise<void> {
    const fromBranch = this.branches().find((b) => b.uuid === this.formFromBranch);
    const toBranch = this.branches().find((b) => b.uuid === this.formToBranch);

    if (!fromBranch || !toBranch) {
      this.formError.set('Select both branches');
      return;
    }
    if (fromBranch.uuid === toBranch.uuid) {
      this.formError.set('Source and destination must be different');
      return;
    }
    if (this.formItems.length === 0) {
      this.formError.set('Add at least one item');
      return;
    }
    for (const item of this.formItems) {
      if (item.quantity <= 0) {
        this.formError.set(`Quantity must be greater than 0 for ${item.item_name}`);
        return;
      }
    }

    if (dispatch) {
      for (const item of this.formItems) {
        const product = this.catalogStore.products().find((p) => p.uuid === item.item_uuid);
        if (!product || product.quantity < item.quantity) {
          this.formError.set(`Insufficient stock for ${item.item_name}`);
          return;
        }
      }
    }

    this.saving.set(true);
    this.formError.set('');

    const data: Partial<IStockTransfer> = {
      from_branch_uuid: fromBranch.uuid,
      from_branch_name: fromBranch.name,
      to_branch_uuid: toBranch.uuid,
      to_branch_name: toBranch.name,
      transfer_date: new Date(this.formDate).getTime(),
      notes: this.formNotes.trim() || null,
    };

    const items: Partial<IStockTransferItem>[] = this.formItems.map((fi) => ({
      item_uuid: fi.item_uuid,
      item_name: fi.item_name,
      quantity: fi.quantity,
      unit: fi.unit || null,
    }));

    try {
      const editing = this.editingTransfer();
      if (editing) {
        await this.transferStore.updateTransfer(editing.uuid, data, items);
        if (dispatch) {
          await this.transferStore.dispatchTransfer(editing.uuid);
        }
      } else {
        const transfer = await this.transferStore.addTransfer(data, items);
        if (dispatch) {
          await this.transferStore.dispatchTransfer(transfer.uuid);
        }
      }
      this.closeForm();
    } catch {
      this.formError.set('Failed to save transfer');
    }

    this.saving.set(false);
  }

  confirmDispatch(transfer: IStockTransfer): void {
    this.confirmAction.set({ type: 'dispatch', transfer });
    this.confirmTitle.set('Dispatch Transfer');
    this.confirmMessage.set('Dispatch this transfer? Stock will be deducted from source.');
    this.confirmVariant.set('primary');
  }

  confirmReceive(transfer: IStockTransfer): void {
    this.confirmAction.set({ type: 'receive', transfer });
    this.confirmTitle.set('Receive Transfer');
    this.confirmMessage.set('Mark this transfer as received?');
    this.confirmVariant.set('primary');
  }

  confirmCancel(transfer: IStockTransfer): void {
    this.confirmAction.set({ type: 'cancel', transfer });
    this.confirmTitle.set('Cancel Transfer');
    this.confirmMessage.set('Cancel this transfer? Stock will be restored.');
    this.confirmVariant.set('danger');
  }

  confirmDelete(transfer: IStockTransfer): void {
    this.confirmAction.set({ type: 'delete', transfer });
    this.confirmTitle.set('Delete Transfer');
    this.confirmMessage.set('Delete this draft transfer?');
    this.confirmVariant.set('danger');
  }

  async onConfirmed(): Promise<void> {
    const action = this.confirmAction();
    if (!action) return;

    const { type, transfer } = action;
    this.confirmAction.set(null);

    if (type === 'dispatch') {
      const ok = await this.transferStore.dispatchTransfer(transfer.uuid);
      if (!ok) {
        this.formError.set('Insufficient stock to dispatch');
      }
    } else if (type === 'receive') {
      await this.transferStore.receiveTransfer(transfer.uuid);
    } else if (type === 'cancel') {
      await this.transferStore.cancelTransfer(transfer.uuid);
    } else if (type === 'delete') {
      await this.transferStore.deleteTransfer(transfer.uuid);
    }
  }
}
