import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe, DecimalPipe } from '@angular/common';
import { ExpenseStore } from '../../core/stores/expense.store';
import { SearchInputComponent } from '../../shared/components/search-input/search-input.component';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { IExpense, IExpenseItem } from '@org/shared-types';

interface ExpenseItemLine {
  item_name: string;
  rate: number;
  quantity: number;
  amount: number;
}

@Component({
  selector: 'gonok-expenses',
  standalone: true,
  imports: [FormsModule, DatePipe, DecimalPipe, SearchInputComponent, ConfirmDialogComponent],
  template: `
    <div class="page-header">
      <h1 class="page-header__title">Expenses</h1>
      <button class="btn btn--primary" (click)="openForm()">+ New Expense</button>
    </div>

    <gonok-search-input
      placeholder="Search by description or category..."
      (searchChange)="searchTerm.set($event)"
    />

    <div class="table-wrapper">
      <table class="table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Category</th>
            <th>Description</th>
            <th>Payment</th>
            <th class="text-right">Amount</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          @for (expense of filteredExpenses(); track expense.uuid) {
            <tr>
              <td>{{ expense.expense_date | date:'dd/MM/yyyy' }}</td>
              <td>{{ getCategoryName(expense.category_uuid) }}</td>
              <td>{{ expense.description || '-' }}</td>
              <td>
                <span class="badge badge--info">{{ expense.payment_type }}</span>
              </td>
              <td class="col-amount">&#2547;{{ expense.total_amount | number:'1.2-2' }}</td>
              <td>
                <div class="action-btns">
                  <button class="btn btn--sm btn--ghost btn--danger-text" (click)="confirmDelete(expense)">Delete</button>
                </div>
              </td>
            </tr>
          } @empty {
            <tr>
              <td colspan="6" class="text-center text-muted">No expenses recorded yet.</td>
            </tr>
          }
        </tbody>
      </table>
    </div>

    <div class="summary-bar">
      Total Expenses: {{ expenseStore.expenses().length }} &middot;
      Total Amount: &#2547;{{ expenseStore.totalExpenses() | number:'1.2-2' }}
    </div>

    <!-- Expense Form Modal -->
    @if (showForm()) {
      <div class="modal-backdrop" (click)="closeForm()">
        <div class="modal modal--wide" (click)="$event.stopPropagation()">
          <div class="modal__header">
            <h3 class="modal__title">New Expense</h3>
            <button class="modal__close" (click)="closeForm()">&times;</button>
          </div>
          <div class="modal__body">
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Date</label>
                <input class="form-input" type="date" [(ngModel)]="formDate" name="expDate" />
              </div>
              <div class="form-group">
                <label class="form-label">Category</label>
                <div class="input-with-btn">
                  <select class="form-input" [(ngModel)]="formCategoryUuid" name="category">
                    <option value="">-- Select Category --</option>
                    @for (cat of expenseStore.expenseCategories(); track cat.uuid) {
                      <option [value]="cat.uuid">{{ cat.name }}</option>
                    }
                  </select>
                  <button class="btn btn--sm btn--ghost" type="button" (click)="showCategoryInput.set(true)">+ New</button>
                </div>
              </div>
            </div>

            @if (showCategoryInput()) {
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">New Category Name</label>
                  <div class="input-with-btn">
                    <input class="form-input" type="text" [(ngModel)]="newCategoryName" name="newCat" placeholder="Category name" />
                    <button class="btn btn--sm btn--primary" type="button" (click)="addCategory()">Add</button>
                  </div>
                </div>
              </div>
            }

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Payment Type</label>
                <select class="form-input" [(ngModel)]="formPaymentType" name="payType">
                  <option value="Cash">Cash</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>
              @if (formPaymentType === 'Cheque') {
                <div class="form-group">
                  <label class="form-label">Cheque Ref No</label>
                  <input class="form-input" type="text" [(ngModel)]="formChequeRef" name="chequeRef" />
                </div>
              }
            </div>

            <!-- Item Lines -->
            <h4 class="section-title">Items</h4>
            <div class="table-wrapper">
              <table class="table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Item</th>
                    <th class="text-right">Rate</th>
                    <th class="text-right">Qty</th>
                    <th class="text-right">Amount</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  @for (line of formItems(); track $index; let i = $index) {
                    <tr>
                      <td>{{ i + 1 }}</td>
                      <td>{{ line.item_name }}</td>
                      <td class="col-amount">{{ line.rate | number:'1.2-2' }}</td>
                      <td class="col-amount">{{ line.quantity }}</td>
                      <td class="col-amount">{{ line.amount | number:'1.2-2' }}</td>
                      <td>
                        <button class="btn btn--sm btn--ghost btn--danger-text" (click)="removeItem(i)">&times;</button>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>

            <div class="add-item-row">
              <input class="form-input" type="text" [(ngModel)]="newItemName" name="newItemName" placeholder="Item name" />
              <input class="form-input form-input--sm" type="number" [(ngModel)]="newItemRate" name="newItemRate" placeholder="Rate" min="0" step="0.01" />
              <input class="form-input form-input--sm" type="number" [(ngModel)]="newItemQty" name="newItemQty" placeholder="Qty" min="1" step="1" />
              <button class="btn btn--sm btn--primary" type="button" (click)="addItem()">Add</button>
            </div>

            <div class="totals-section">
              <div class="total-row total-row--grand">
                <span>Total</span>
                <span class="col-amount">&#2547;{{ formTotal() | number:'1.2-2' }}</span>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Description</label>
              <textarea class="form-input" [(ngModel)]="formDescription" name="desc" rows="2" placeholder="Optional notes"></textarea>
            </div>

            @if (formError()) {
              <p class="form-error">{{ formError() }}</p>
            }
          </div>
          <div class="modal__footer">
            <button class="btn btn--ghost" type="button" (click)="closeForm()">Cancel</button>
            <button class="btn btn--primary" (click)="saveExpense()" [disabled]="saving()">
              {{ saving() ? 'Saving...' : 'Save' }}
            </button>
          </div>
        </div>
      </div>
    }

    <gonok-confirm-dialog
      [visible]="showDeleteConfirm()"
      title="Delete Expense"
      message="Delete this expense? This cannot be undone."
      confirmLabel="Delete"
      variant="danger"
      (confirmed)="doDelete()"
      (cancelled)="showDeleteConfirm.set(false)"
    />
  `,
  styles: `
    @use '../../../styles/abstracts/variables' as *;

    .action-btns {
      display: flex;
      gap: $space-1;
    }
    .btn--danger-text {
      color: $color-danger;
      &:hover { background: rgba($color-danger, 0.08); }
    }
    .text-center { text-align: center; }
    .text-muted { color: $color-text-secondary; }
    .summary-bar {
      margin-top: $space-4;
      padding: $space-3 $space-4;
      background: $color-gray-50;
      border-radius: $radius-md;
      font-size: $font-size-sm;
      color: $color-text-secondary;
    }
    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: $space-4;
      margin-bottom: $space-4;
      @media (max-width: 640px) { grid-template-columns: 1fr; }
    }
    .form-group { margin-bottom: 0; }
    .input-with-btn {
      display: flex;
      gap: $space-2;
      select, input { flex: 1; }
    }
    .section-title {
      font-size: $font-size-base;
      font-weight: $font-weight-semibold;
      margin-bottom: $space-2;
    }
    .add-item-row {
      display: flex;
      gap: $space-2;
      margin-top: $space-2;
      margin-bottom: $space-4;
      align-items: center;
      input:first-child { flex: 2; }
      .form-input--sm { width: 100px; }
    }
    .totals-section {
      background: $color-gray-50;
      border-radius: $radius-md;
      padding: $space-3 $space-4;
      margin-bottom: $space-4;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: $space-1 0;
    }
    .total-row--grand {
      font-weight: $font-weight-semibold;
      font-size: $font-size-base;
    }
  `,
})
export class ExpensesComponent implements OnInit {
  expenseStore = inject(ExpenseStore);

  searchTerm = signal('');
  showForm = signal(false);
  showDeleteConfirm = signal(false);
  deletingExpense = signal<IExpense | null>(null);
  saving = signal(false);
  formError = signal('');
  showCategoryInput = signal(false);

  // Form fields
  formDate = new Date().toISOString().split('T')[0];
  formCategoryUuid = '';
  formPaymentType = 'Cash';
  formChequeRef = '';
  formDescription = '';
  newCategoryName = '';

  // Item lines
  formItems = signal<ExpenseItemLine[]>([]);
  newItemName = '';
  newItemRate = 0;
  newItemQty = 1;

  formTotal = computed(() =>
    this.formItems().reduce((s, i) => s + i.amount, 0),
  );

  filteredExpenses = computed(() => {
    const term = this.searchTerm().toLowerCase();
    let expenses = this.expenseStore.expenses();
    if (term) {
      expenses = expenses.filter(
        (e) =>
          (e.description || '').toLowerCase().includes(term) ||
          this.getCategoryName(e.category_uuid).toLowerCase().includes(term),
      );
    }
    return [...expenses].sort((a, b) => b.expense_date - a.expense_date);
  });

  ngOnInit(): void {
    if (!this.expenseStore.initialized()) {
      this.expenseStore.loadAll();
    }
  }

  getCategoryName(uuid: string | null): string {
    if (!uuid) return '-';
    const cat = this.expenseStore.expenseCategories().find((c) => c.uuid === uuid);
    return cat?.name || '-';
  }

  openForm(): void {
    this.formDate = new Date().toISOString().split('T')[0];
    this.formCategoryUuid = '';
    this.formPaymentType = 'Cash';
    this.formChequeRef = '';
    this.formDescription = '';
    this.formItems.set([]);
    this.formError.set('');
    this.showCategoryInput.set(false);
    this.showForm.set(true);
  }

  closeForm(): void {
    this.showForm.set(false);
  }

  async addCategory(): Promise<void> {
    const name = this.newCategoryName.trim();
    if (!name) return;
    const cat = await this.expenseStore.addCategory(name);
    this.formCategoryUuid = cat.uuid;
    this.newCategoryName = '';
    this.showCategoryInput.set(false);
  }

  addItem(): void {
    const name = this.newItemName.trim();
    if (!name) return;
    const rate = this.newItemRate || 0;
    const qty = this.newItemQty || 1;
    this.formItems.update((items) => [
      ...items,
      { item_name: name, rate, quantity: qty, amount: rate * qty },
    ]);
    this.newItemName = '';
    this.newItemRate = 0;
    this.newItemQty = 1;
  }

  removeItem(index: number): void {
    this.formItems.update((items) => items.filter((_, i) => i !== index));
  }

  async saveExpense(): Promise<void> {
    if (this.formItems().length === 0) {
      this.formError.set('Add at least one item');
      return;
    }

    this.saving.set(true);
    this.formError.set('');

    const items = this.formItems();
    const data: Partial<IExpense> = {
      category_uuid: this.formCategoryUuid || null,
      expense_date: new Date(this.formDate).getTime(),
      description: this.formDescription.trim() || null,
      payment_type: this.formPaymentType,
      cheque_ref_no: this.formChequeRef.trim() || null,
      total_amount: this.formTotal(),
      total_quantity: items.reduce((s, i) => s + i.quantity, 0),
    };

    const expItems: Partial<IExpenseItem>[] = items.map((i) => ({
      item_name: i.item_name,
      rate: i.rate,
      quantity: i.quantity,
      amount: i.amount,
    }));

    try {
      await this.expenseStore.addExpense(data, expItems);
      this.closeForm();
    } catch {
      this.formError.set('Failed to save expense');
    }
    this.saving.set(false);
  }

  confirmDelete(expense: IExpense): void {
    this.deletingExpense.set(expense);
    this.showDeleteConfirm.set(true);
  }

  async doDelete(): Promise<void> {
    const expense = this.deletingExpense();
    if (expense) {
      await this.expenseStore.deleteExpense(expense.uuid);
    }
    this.showDeleteConfirm.set(false);
    this.deletingExpense.set(null);
  }
}
