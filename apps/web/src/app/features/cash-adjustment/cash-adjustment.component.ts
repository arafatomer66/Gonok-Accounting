import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DecimalPipe, DatePipe } from '@angular/common';
import { PouchDbService } from '../../core/services/pouchdb.service';
import { AuthStore } from '../../core/stores/auth.store';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { ETables } from '@org/shared-types';

interface ICashAdjustment {
  uuid: string;
  table_type: string;
  business_uuid: string;
  type: 'cash_in' | 'cash_out';
  amount: number;
  reason: string;
  notes: string | null;
  adjustment_date: number;
  created_at: number;
  updated_at: number;
}

@Component({
  selector: 'gonok-cash-adjustment',
  standalone: true,
  imports: [FormsModule, DecimalPipe, DatePipe, ConfirmDialogComponent],
  template: `
    <div class="page-header">
      <h1 class="page-header__title">Cash Adjustment</h1>
      <button class="btn btn--primary" (click)="openForm()">+ New Adjustment</button>
    </div>

    <!-- Summary -->
    <div class="summary-cards">
      <div class="card card--stat">
        <div class="card__label">Total Cash In</div>
        <div class="card__value card__value--success">&#2547;{{ totalCashIn() | number:'1.2-2' }}</div>
      </div>
      <div class="card card--stat">
        <div class="card__label">Total Cash Out</div>
        <div class="card__value card__value--danger">&#2547;{{ totalCashOut() | number:'1.2-2' }}</div>
      </div>
      <div class="card card--stat">
        <div class="card__label">Net Adjustment</div>
        <div class="card__value">&#2547;{{ netAdjustment() | number:'1.2-2' }}</div>
      </div>
    </div>

    <!-- List -->
    <div class="table-wrapper">
      <table class="table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Type</th>
            <th>Reason</th>
            <th>Notes</th>
            <th class="text-right">Amount</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          @for (adj of sortedAdjustments(); track adj.uuid) {
            <tr>
              <td>{{ adj.adjustment_date | date:'dd/MM/yyyy' }}</td>
              <td>
                <span class="badge" [class.badge--success]="adj.type === 'cash_in'" [class.badge--danger]="adj.type === 'cash_out'">
                  {{ adj.type === 'cash_in' ? 'Cash In' : 'Cash Out' }}
                </span>
              </td>
              <td>{{ adj.reason }}</td>
              <td class="text-muted">{{ adj.notes || '-' }}</td>
              <td class="col-amount" [class.text-success]="adj.type === 'cash_in'" [class.text-danger]="adj.type === 'cash_out'">
                {{ adj.type === 'cash_in' ? '+' : '-' }}&#2547;{{ adj.amount | number:'1.2-2' }}
              </td>
              <td>
                <button class="btn btn--sm btn--ghost btn--danger-text" (click)="confirmDelete(adj)">Delete</button>
              </td>
            </tr>
          } @empty {
            <tr>
              <td colspan="6" class="text-center text-muted">No cash adjustments recorded.</td>
            </tr>
          }
        </tbody>
      </table>
    </div>

    <!-- Form Modal -->
    @if (showForm()) {
      <div class="modal-backdrop" (click)="closeForm()">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal__header">
            <h3 class="modal__title">New Cash Adjustment</h3>
            <button class="modal__close" (click)="closeForm()">&times;</button>
          </div>
          <div class="modal__body">
            <div class="form-group">
              <label class="form-label">Type *</label>
              <select class="form-input" [(ngModel)]="formType" name="type">
                <option value="cash_in">Cash In (Found / Added)</option>
                <option value="cash_out">Cash Out (Short / Withdrawn)</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Amount *</label>
              <input class="form-input" type="number" [(ngModel)]="formAmount" name="amount" min="0.01" step="0.01" placeholder="0.00" />
            </div>
            <div class="form-group">
              <label class="form-label">Reason *</label>
              <select class="form-input" [(ngModel)]="formReason" name="reason">
                <option value="">-- Select Reason --</option>
                <option value="Cash Short">Cash Short</option>
                <option value="Cash Excess">Cash Excess</option>
                <option value="Owner Withdrawal">Owner Withdrawal</option>
                <option value="Owner Investment">Owner Investment</option>
                <option value="Petty Cash">Petty Cash</option>
                <option value="Bank Deposit">Bank Deposit</option>
                <option value="Bank Withdrawal">Bank Withdrawal</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Date</label>
              <input class="form-input" type="date" [(ngModel)]="formDate" name="date" />
            </div>
            <div class="form-group">
              <label class="form-label">Notes</label>
              <textarea class="form-input" [(ngModel)]="formNotes" name="notes" rows="2" placeholder="Optional notes"></textarea>
            </div>
            @if (formError()) {
              <p class="form-error">{{ formError() }}</p>
            }
          </div>
          <div class="modal__footer">
            <button class="btn btn--ghost" type="button" (click)="closeForm()">Cancel</button>
            <button class="btn btn--primary" (click)="saveAdjustment()" [disabled]="saving()">
              {{ saving() ? 'Saving...' : 'Save' }}
            </button>
          </div>
        </div>
      </div>
    }

    <gonok-confirm-dialog
      [visible]="showDeleteConfirm()"
      title="Delete Adjustment"
      message="Delete this cash adjustment? This cannot be undone."
      confirmLabel="Delete"
      variant="danger"
      (confirmed)="doDelete()"
      (cancelled)="showDeleteConfirm.set(false)"
    />
  `,
  styles: `
    @use '../../../styles/abstracts/variables' as *;

    .summary-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: $space-5;
      margin-bottom: $space-6;
    }
    .card__value--success { color: $color-success; }
    .card__value--danger { color: $color-danger; }
    .text-success { color: $color-success; }
    .text-danger { color: $color-danger; }
    .text-center { text-align: center; }
    .text-muted { color: $color-text-secondary; }
    .btn--danger-text {
      color: $color-danger;
      &:hover { background: rgba($color-danger, 0.08); }
    }
    .form-group { margin-bottom: $space-4; }
  `,
})
export class CashAdjustmentComponent implements OnInit {
  private pouchDb = inject(PouchDbService);
  private authStore = inject(AuthStore);

  adjustments = signal<ICashAdjustment[]>([]);
  showForm = signal(false);
  showDeleteConfirm = signal(false);
  deletingAdj = signal<ICashAdjustment | null>(null);
  saving = signal(false);
  formError = signal('');

  formType: 'cash_in' | 'cash_out' = 'cash_in';
  formAmount = 0;
  formReason = '';
  formDate = new Date().toISOString().split('T')[0];
  formNotes = '';

  sortedAdjustments = computed(() =>
    [...this.adjustments()].sort((a, b) => b.adjustment_date - a.adjustment_date),
  );

  totalCashIn = computed(() =>
    this.adjustments()
      .filter((a) => a.type === 'cash_in')
      .reduce((s, a) => s + a.amount, 0),
  );

  totalCashOut = computed(() =>
    this.adjustments()
      .filter((a) => a.type === 'cash_out')
      .reduce((s, a) => s + a.amount, 0),
  );

  netAdjustment = computed(() => this.totalCashIn() - this.totalCashOut());

  async ngOnInit(): Promise<void> {
    await this.loadAdjustments();
  }

  async loadAdjustments(): Promise<void> {
    const bizUuid = this.authStore.activeBusinessUuid();
    if (!bizUuid) return;
    const all = await this.pouchDb.findByBusiness<ICashAdjustment>(
      ETables.CASH_ADJUSTMENT,
      bizUuid,
    );
    this.adjustments.set(all);
  }

  openForm(): void {
    this.formType = 'cash_in';
    this.formAmount = 0;
    this.formReason = '';
    this.formDate = new Date().toISOString().split('T')[0];
    this.formNotes = '';
    this.formError.set('');
    this.showForm.set(true);
  }

  closeForm(): void {
    this.showForm.set(false);
  }

  async saveAdjustment(): Promise<void> {
    if (this.formAmount <= 0) {
      this.formError.set('Amount must be greater than zero');
      return;
    }
    if (!this.formReason) {
      this.formError.set('Please select a reason');
      return;
    }
    if (!this.formDate) {
      this.formError.set('Date is required');
      return;
    }
    const adjDate = new Date(this.formDate);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (adjDate > today) {
      this.formError.set('Date cannot be in the future');
      return;
    }

    const bizUuid = this.authStore.activeBusinessUuid();
    if (!bizUuid) return;

    this.saving.set(true);
    this.formError.set('');

    const uuid = crypto.randomUUID();
    const now = Date.now();

    const adj: ICashAdjustment = {
      uuid,
      table_type: ETables.CASH_ADJUSTMENT,
      business_uuid: bizUuid,
      type: this.formType,
      amount: this.formAmount,
      reason: this.formReason,
      notes: this.formNotes.trim() || null,
      adjustment_date: new Date(this.formDate).getTime(),
      created_at: now,
      updated_at: now,
    };

    await this.pouchDb.put(
      ETables.CASH_ADJUSTMENT,
      uuid,
      adj as unknown as Record<string, unknown>,
    );
    this.closeForm();
    await this.loadAdjustments();
    this.saving.set(false);
  }

  confirmDelete(adj: ICashAdjustment): void {
    this.deletingAdj.set(adj);
    this.showDeleteConfirm.set(true);
  }

  async doDelete(): Promise<void> {
    const adj = this.deletingAdj();
    if (adj) {
      await this.pouchDb.remove(ETables.CASH_ADJUSTMENT, adj.uuid);
      await this.loadAdjustments();
    }
    this.showDeleteConfirm.set(false);
    this.deletingAdj.set(null);
  }
}
