import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { BranchStore } from '../../core/stores/branch.store';
import { CatalogStore } from '../../core/stores/catalog.store';
import { IBranch } from '@org/shared-types';

@Component({
  selector: 'gonok-branches',
  standalone: true,
  imports: [FormsModule, DatePipe, ConfirmDialogComponent],
  template: `
    <div class="page-header">
      <h1 class="page-header__title">Branches</h1>
      <button class="btn btn--primary" (click)="openForm()">+ New Branch</button>
    </div>

    <div class="branch-grid">
      @for (branch of branches(); track branch.uuid) {
        <div class="card branch-card" [class.branch-card--main]="branch.is_main">
          <div class="branch-header">
            <h3 class="branch-name">{{ branch.name }}</h3>
            @if (branch.is_main) {
              <span class="badge badge--success">Main</span>
            }
          </div>
          @if (branch.address) {
            <p class="branch-detail">📍 {{ branch.address }}</p>
          }
          @if (branch.phone) {
            <p class="branch-detail">📞 {{ branch.phone }}</p>
          }
          <p class="branch-date">Created: {{ branch.created_at | date:'dd/MM/yyyy' }}</p>
          <div class="branch-actions">
            <button class="btn btn--sm btn--ghost" (click)="editBranch(branch)">Edit</button>
            @if (!branch.is_main) {
              <button class="btn btn--sm btn--ghost btn--danger-text" (click)="confirmDelete(branch)">Delete</button>
            }
          </div>
        </div>
      } @empty {
        <div class="empty-state">
          <p>No branches created yet.</p>
          <small>Add your first branch to enable multi-location management.</small>
        </div>
      }
    </div>

    <!-- Form Modal -->
    @if (showForm()) {
      <div class="modal-backdrop" (click)="closeForm()">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal__header">
            <h3 class="modal__title">{{ editing() ? 'Edit Branch' : 'New Branch' }}</h3>
            <button class="modal__close" (click)="closeForm()">&times;</button>
          </div>
          <div class="modal__body">
            <div class="form-group">
              <label class="form-label">Branch Name *</label>
              <input class="form-input" type="text" [(ngModel)]="formName" name="name" placeholder="e.g. Main Store, Warehouse" />
            </div>
            <div class="form-group">
              <label class="form-label">Address</label>
              <input class="form-input" type="text" [(ngModel)]="formAddress" name="address" placeholder="Branch address" />
            </div>
            <div class="form-group">
              <label class="form-label">Phone</label>
              <input class="form-input" type="text" [(ngModel)]="formPhone" name="phone" placeholder="Branch phone" />
            </div>
            <div class="form-group">
              <label class="form-check">
                <input type="checkbox" [(ngModel)]="formIsMain" name="isMain" />
                <span>Set as main branch</span>
              </label>
            </div>
            @if (formError()) {
              <p class="form-error">{{ formError() }}</p>
            }
          </div>
          <div class="modal__footer">
            <button class="btn btn--ghost" (click)="closeForm()">Cancel</button>
            <button class="btn btn--primary" (click)="save()" [disabled]="saving()">
              {{ saving() ? 'Saving...' : 'Save' }}
            </button>
          </div>
        </div>
      </div>
    }

    <gonok-confirm-dialog
      [visible]="showDeleteConfirm()"
      title="Delete Branch"
      message="Delete this branch? This cannot be undone."
      confirmLabel="Delete"
      variant="danger"
      (confirmed)="doDelete()"
      (cancelled)="showDeleteConfirm.set(false)"
    />
  `,
  styles: `
    @use '../../../styles/abstracts/variables' as *;

    .branch-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: $space-5;
    }

    .branch-card {
      padding: $space-5;
      border: 1px solid $color-border;
      transition: box-shadow 150ms ease;
      &:hover { box-shadow: $shadow-md; }
    }

    .branch-card--main {
      border-color: $color-primary;
      border-width: 2px;
    }

    .branch-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: $space-2;
    }

    .branch-name {
      font-size: $font-size-lg;
      font-weight: $font-weight-bold;
      margin: 0;
    }

    .branch-detail {
      font-size: $font-size-sm;
      color: $color-text-secondary;
      margin: $space-1 0;
    }

    .branch-date {
      font-size: $font-size-xs;
      color: $color-text-muted;
      margin: $space-2 0;
    }

    .branch-actions {
      display: flex;
      gap: $space-2;
      margin-top: $space-3;
    }

    .btn--danger-text {
      color: $color-danger;
      &:hover { background: rgba($color-danger, 0.08); }
    }

    .empty-state {
      text-align: center;
      padding: $space-8;
      color: $color-text-secondary;
      grid-column: 1 / -1;
      small { display: block; margin-top: $space-2; }
    }

    .form-check {
      display: flex;
      align-items: center;
      gap: $space-2;
      cursor: pointer;
      font-size: $font-size-sm;
      input { width: 16px; height: 16px; }
    }
  `,
})
export class BranchesComponent implements OnInit {
  branchStore = inject(BranchStore);
  private catalogStore = inject(CatalogStore);

  get branches() { return this.branchStore.branches; }
  showForm = signal(false);
  showDeleteConfirm = signal(false);
  editing = signal<IBranch | null>(null);
  deleting = signal<IBranch | null>(null);
  saving = signal(false);
  formError = signal('');

  formName = '';
  formAddress = '';
  formPhone = '';
  formIsMain = false;

  async ngOnInit(): Promise<void> {
    if (!this.branchStore.initialized()) {
      await this.branchStore.loadAll();
    }
  }

  openForm(): void {
    this.editing.set(null);
    this.formName = '';
    this.formAddress = '';
    this.formPhone = '';
    this.formIsMain = this.branches().length === 0;
    this.formError.set('');
    this.showForm.set(true);
  }

  editBranch(branch: IBranch): void {
    this.editing.set(branch);
    this.formName = branch.name;
    this.formAddress = branch.address || '';
    this.formPhone = branch.phone || '';
    this.formIsMain = branch.is_main;
    this.formError.set('');
    this.showForm.set(true);
  }

  closeForm(): void {
    this.showForm.set(false);
    this.editing.set(null);
  }

  async save(): Promise<void> {
    const name = this.formName.trim();
    if (!name) {
      this.formError.set('Branch name is required');
      return;
    }

    this.saving.set(true);
    this.formError.set('');

    const existingEdit = this.editing();

    try {
      if (existingEdit) {
        await this.branchStore.updateBranch(existingEdit.uuid, {
          name,
          address: this.formAddress.trim() || null,
          phone: this.formPhone.trim() || null,
          is_main: this.formIsMain,
        });
      } else {
        await this.branchStore.addBranch({
          name,
          address: this.formAddress.trim() || null,
          phone: this.formPhone.trim() || null,
          is_main: this.formIsMain,
        });
      }
      this.closeForm();
    } catch {
      this.formError.set('Failed to save branch');
    }

    this.saving.set(false);
  }

  confirmDelete(branch: IBranch): void {
    this.deleting.set(branch);
    this.showDeleteConfirm.set(true);
  }

  async doDelete(): Promise<void> {
    const branch = this.deleting();
    if (branch) {
      // Check if any product has stock at this branch
      const hasStock = this.catalogStore.products().some(
        (p) => (p.stock_by_branch?.[branch.uuid] ?? 0) > 0,
      );
      if (hasStock) {
        const proceed = confirm(
          `Branch "${branch.name}" has stock allocated. Deleting will remove the stock allocation. Proceed?`,
        );
        if (!proceed) {
          this.showDeleteConfirm.set(false);
          this.deleting.set(null);
          return;
        }
      }
      await this.branchStore.deleteBranch(branch.uuid);
    }
    this.showDeleteConfirm.set(false);
    this.deleting.set(null);
  }
}
