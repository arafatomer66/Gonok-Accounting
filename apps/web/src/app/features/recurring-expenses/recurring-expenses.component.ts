import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DecimalPipe, DatePipe } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { RecurringExpenseStore } from '../../core/stores/recurring-expense.store';
import { ExpenseStore } from '../../core/stores/expense.store';
import { IRecurringExpense } from '@org/shared-types';

@Component({
  selector: 'gonok-recurring-expenses',
  standalone: true,
  imports: [FormsModule, DecimalPipe, DatePipe, TranslateModule],
  styleUrl: './recurring-expenses.component.scss',
  template: `
    <div class="page-header">
      <h1 class="page-header__title">{{ 'recurring.title' | translate }}</h1>
      <div class="page-header__actions">
        @if (recurringStore.overdueRecurring().length > 0) {
          <button class="btn btn--accent" (click)="generateAll()">
            {{ generating() ? 'Generating...' : 'Generate Due (' + recurringStore.overdueRecurring().length + ')' }}
          </button>
        }
        <button class="btn btn--primary" (click)="openForm()">+ {{ 'recurring.new' | translate }}</button>
      </div>
    </div>

    <!-- Summary Cards -->
    <div class="summary-cards">
      <div class="summary-card">
        <div class="summary-card__label">{{ 'recurring.active' | translate }}</div>
        <div class="summary-card__value">{{ recurringStore.activeRecurring().length }}</div>
      </div>
      <div class="summary-card">
        <div class="summary-card__label">{{ 'recurring.overdue' | translate }}</div>
        <div class="summary-card__value summary-card__value--danger">{{ recurringStore.overdueRecurring().length }}</div>
      </div>
      <div class="summary-card">
        <div class="summary-card__label">{{ 'recurring.monthly_total' | translate }}</div>
        <div class="summary-card__value">&#2547;{{ monthlyTotal() | number:'1.0-0' }}</div>
      </div>
    </div>

    <!-- List -->
    <div class="card">
      <div class="table-wrapper">
        <table class="table">
          <thead>
            <tr>
              <th>{{ 'base.name' | translate }}</th>
              <th>{{ 'recurring.frequency' | translate }}</th>
              <th class="text-right">{{ 'transaction.amount' | translate }}</th>
              <th>{{ 'recurring.next_due' | translate }}</th>
              <th>{{ 'recurring.last_generated' | translate }}</th>
              <th>{{ 'quotation.status' | translate }}</th>
              <th>{{ 'base.action' | translate }}</th>
            </tr>
          </thead>
          <tbody>
            @for (r of sortedRecurring(); track r.uuid) {
              <tr [class.row-overdue]="isOverdue(r)">
                <td class="font-medium">{{ r.name }}</td>
                <td><span class="badge badge--info">{{ r.frequency }}</span></td>
                <td class="text-right font-medium">&#2547;{{ r.amount | number:'1.2-2' }}</td>
                <td>
                  <span [class.text-danger]="isOverdue(r)">{{ r.next_due_date | date:'dd/MM/yyyy' }}</span>
                  @if (isOverdue(r)) {
                    <span class="overdue-badge">Overdue</span>
                  }
                </td>
                <td>{{ r.last_generated_date ? (r.last_generated_date | date:'dd/MM/yyyy') : '-' }}</td>
                <td>
                  <span class="badge" [class.badge--success]="r.active" [class.badge--warning]="!r.active">
                    {{ r.active ? 'Active' : 'Paused' }}
                  </span>
                </td>
                <td>
                  <div class="action-btns">
                    <button class="btn btn--sm btn--ghost" (click)="editRecurring(r)">{{ 'base.edit' | translate }}</button>
                    <button class="btn btn--sm btn--ghost" (click)="toggleActive(r)">
                      {{ r.active ? 'Pause' : 'Resume' }}
                    </button>
                    <button class="btn btn--sm btn--ghost text-danger" (click)="confirmDelete(r)">&times;</button>
                  </div>
                </td>
              </tr>
            } @empty {
              <tr><td colspan="7" class="text-center text-muted">No recurring expenses set up yet</td></tr>
            }
          </tbody>
        </table>
      </div>
    </div>

    @if (generateResult()) {
      <p class="success-msg">{{ generateResult() }}</p>
    }

    <!-- Form Modal -->
    @if (showForm()) {
      <div class="modal-backdrop" (click)="closeForm()">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal__header">
            <h3>{{ editingUuid ? ('recurring.edit' | translate) : ('recurring.new' | translate) }}</h3>
            <button class="modal__close" (click)="closeForm()">&times;</button>
          </div>

          <div class="modal__body">
            <div class="form-group">
              <label class="form-label">{{ 'base.name' | translate }} *</label>
              <input class="form-input" type="text" [(ngModel)]="formName" name="name" placeholder="e.g. Office Rent, Electricity" />
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">{{ 'transaction.amount' | translate }} *</label>
                <input class="form-input" type="number" [(ngModel)]="formAmount" name="amount" min="0" />
              </div>
              <div class="form-group">
                <label class="form-label">{{ 'recurring.frequency' | translate }}</label>
                <select class="form-input" [(ngModel)]="formFrequency" name="frequency">
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">{{ 'recurring.start_date' | translate }}</label>
                <input class="form-input" type="date" [(ngModel)]="formStartDate" name="startDate" />
              </div>
              <div class="form-group">
                <label class="form-label">{{ 'recurring.payment_type' | translate }}</label>
                <select class="form-input" [(ngModel)]="formPaymentType" name="paymentType">
                  <option value="Cash">Cash</option>
                  <option value="bKash">bKash</option>
                  <option value="Nagad">Nagad</option>
                  <option value="Bank">Bank</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">{{ 'recurring.category' | translate }}</label>
              <select class="form-input" [(ngModel)]="formCategoryUuid" name="category">
                <option value="">None</option>
                @for (cat of expenseStore.expenseCategories(); track cat.uuid) {
                  <option [value]="cat.uuid">{{ cat.name }}</option>
                }
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">{{ 'base.description' | translate }}</label>
              <input class="form-input" type="text" [(ngModel)]="formDescription" name="desc" />
            </div>

            @if (formError()) {
              <p class="form-error">{{ formError() }}</p>
            }
          </div>

          <div class="modal__footer">
            <button class="btn btn--ghost" (click)="closeForm()">{{ 'base.cancel' | translate }}</button>
            <button class="btn btn--primary" (click)="saveRecurring()" [disabled]="saving()">
              {{ saving() ? 'Saving...' : ('base.save' | translate) }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class RecurringExpensesComponent implements OnInit {
  recurringStore = inject(RecurringExpenseStore);
  expenseStore = inject(ExpenseStore);

  showForm = signal(false);
  saving = signal(false);
  generating = signal(false);
  formError = signal('');
  generateResult = signal('');

  editingUuid = '';
  formName = '';
  formAmount = 0;
  formFrequency = 'monthly';
  formStartDate = '';
  formPaymentType = 'Cash';
  formCategoryUuid = '';
  formDescription = '';

  sortedRecurring = computed(() =>
    [...this.recurringStore.recurringExpenses()].sort((a, b) => a.next_due_date - b.next_due_date),
  );

  monthlyTotal = computed(() =>
    this.recurringStore.activeRecurring()
      .filter((r) => r.frequency === 'monthly')
      .reduce((s, r) => s + r.amount, 0),
  );

  ngOnInit(): void {
    if (!this.recurringStore.initialized()) this.recurringStore.loadAll();
    if (!this.expenseStore.initialized()) this.expenseStore.loadAll();
  }

  isOverdue(r: IRecurringExpense): boolean {
    return r.active && r.next_due_date <= Date.now();
  }

  openForm(): void {
    this.editingUuid = '';
    this.formName = '';
    this.formAmount = 0;
    this.formFrequency = 'monthly';
    this.formStartDate = new Date().toISOString().split('T')[0];
    this.formPaymentType = 'Cash';
    this.formCategoryUuid = '';
    this.formDescription = '';
    this.formError.set('');
    this.showForm.set(true);
  }

  editRecurring(r: IRecurringExpense): void {
    this.editingUuid = r.uuid;
    this.formName = r.name;
    this.formAmount = r.amount;
    this.formFrequency = r.frequency;
    this.formStartDate = new Date(r.start_date).toISOString().split('T')[0];
    this.formPaymentType = r.payment_type;
    this.formCategoryUuid = r.category_uuid || '';
    this.formDescription = r.description || '';
    this.formError.set('');
    this.showForm.set(true);
  }

  closeForm(): void {
    this.showForm.set(false);
  }

  async saveRecurring(): Promise<void> {
    if (!this.formName.trim()) {
      this.formError.set('Name is required');
      return;
    }
    if (this.formAmount <= 0) {
      this.formError.set('Amount must be greater than 0');
      return;
    }

    this.saving.set(true);

    const startDate = new Date(this.formStartDate).getTime();
    const data: Partial<IRecurringExpense> = {
      name: this.formName.trim(),
      amount: this.formAmount,
      frequency: this.formFrequency as IRecurringExpense['frequency'],
      start_date: startDate,
      next_due_date: startDate,
      payment_type: this.formPaymentType,
      category_uuid: this.formCategoryUuid || null,
      description: this.formDescription.trim() || null,
    };

    if (this.editingUuid) {
      await this.recurringStore.updateRecurring(this.editingUuid, data);
    } else {
      await this.recurringStore.addRecurring(data);
    }

    this.saving.set(false);
    this.closeForm();
  }

  async toggleActive(r: IRecurringExpense): Promise<void> {
    await this.recurringStore.updateRecurring(r.uuid, { active: !r.active });
  }

  async confirmDelete(r: IRecurringExpense): Promise<void> {
    if (confirm(`Delete recurring expense "${r.name}"?`)) {
      await this.recurringStore.deleteRecurring(r.uuid);
    }
  }

  async generateAll(): Promise<void> {
    this.generating.set(true);
    this.generateResult.set('');
    const count = await this.recurringStore.generateDueExpenses();
    this.generateResult.set(`Generated ${count} expense(s) successfully.`);
    this.generating.set(false);
  }
}
