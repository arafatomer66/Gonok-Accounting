import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthStore } from '../../core/stores/auth.store';
import { PouchDbService } from '../../core/services/pouchdb.service';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { EUserRole } from '@org/shared-types';

interface LocalUser {
  uuid: string;
  table_type: string;
  business_uuid: string;
  name: string;
  phone: string;
  role: EUserRole;
  created_at: number;
  updated_at: number;
}

const TABLE_TYPE = 'business_user';

@Component({
  selector: 'gonok-users',
  standalone: true,
  imports: [FormsModule, ConfirmDialogComponent],
  template: `
    <div class="page-header">
      <h1 class="page-header__title">Users</h1>
      <button class="btn btn--primary" (click)="openForm()">+ Add User</button>
    </div>

    <div class="table-wrapper">
      <table class="table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Phone</th>
            <th>Role</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <!-- Current logged-in user (owner) -->
          <tr>
            <td>{{ authStore.user()?.name || 'You' }}</td>
            <td>{{ authStore.user()?.phone || '-' }}</td>
            <td><span class="badge badge--success">Owner</span></td>
            <td class="text-muted">—</td>
          </tr>
          @for (user of users(); track user.uuid) {
            <tr>
              <td>{{ user.name }}</td>
              <td>{{ user.phone }}</td>
              <td>
                <span class="badge"
                  [class.badge--info]="user.role === 'editor'"
                  [class.badge--secondary]="user.role === 'viewer'"
                >{{ user.role === 'editor' ? 'Editor' : 'Viewer' }}</span>
              </td>
              <td>
                <div class="action-btns">
                  <button class="btn btn--sm btn--ghost" (click)="editUser(user)">Edit</button>
                  <button class="btn btn--sm btn--ghost btn--danger-text" (click)="confirmDelete(user)">Remove</button>
                </div>
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>

    <div class="summary-bar">
      Total Users: {{ users().length + 1 }}
    </div>

    <!-- User Form Modal -->
    @if (showForm()) {
      <div class="modal-backdrop" (click)="closeForm()">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal__header">
            <h3 class="modal__title">{{ editingUser() ? 'Edit User' : 'Add User' }}</h3>
            <button class="modal__close" (click)="closeForm()">&times;</button>
          </div>
          <div class="modal__body">
            <div class="form-group">
              <label class="form-label">Name *</label>
              <input class="form-input" type="text" [(ngModel)]="formName" name="name" placeholder="User name" />
            </div>
            <div class="form-group">
              <label class="form-label">Phone *</label>
              <input class="form-input" type="tel" [(ngModel)]="formPhone" name="phone" placeholder="01XXXXXXXXX" />
            </div>
            <div class="form-group">
              <label class="form-label">Role</label>
              <select class="form-input" [(ngModel)]="formRole" name="role">
                <option value="editor">Editor — can add/edit data</option>
                <option value="viewer">Viewer — read-only access</option>
              </select>
            </div>
            @if (formError()) {
              <p class="form-error">{{ formError() }}</p>
            }
          </div>
          <div class="modal__footer">
            <button class="btn btn--ghost" type="button" (click)="closeForm()">Cancel</button>
            <button class="btn btn--primary" (click)="saveUser()" [disabled]="saving()">
              {{ saving() ? 'Saving...' : 'Save' }}
            </button>
          </div>
        </div>
      </div>
    }

    <gonok-confirm-dialog
      [visible]="showDeleteConfirm()"
      title="Remove User"
      [message]="'Remove ' + (deletingUser()?.name || '') + ' from this business?'"
      confirmLabel="Remove"
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
    .text-muted { color: $color-text-secondary; }
    .summary-bar {
      margin-top: $space-4;
      padding: $space-3 $space-4;
      background: $color-gray-50;
      border-radius: $radius-md;
      font-size: $font-size-sm;
      color: $color-text-secondary;
    }
  `,
})
export class UsersComponent implements OnInit {
  authStore = inject(AuthStore);
  private pouchDb = inject(PouchDbService);

  users = signal<LocalUser[]>([]);
  showForm = signal(false);
  editingUser = signal<LocalUser | null>(null);
  showDeleteConfirm = signal(false);
  deletingUser = signal<LocalUser | null>(null);
  saving = signal(false);
  formError = signal('');

  formName = '';
  formPhone = '';
  formRole: EUserRole = EUserRole.EDITOR;

  async ngOnInit(): Promise<void> {
    await this.loadUsers();
  }

  async loadUsers(): Promise<void> {
    const bizUuid = this.authStore.activeBusinessUuid();
    if (!bizUuid) return;
    const all = await this.pouchDb.findByBusiness<LocalUser>(TABLE_TYPE, bizUuid);
    this.users.set(all);
  }

  openForm(): void {
    this.editingUser.set(null);
    this.formName = '';
    this.formPhone = '';
    this.formRole = EUserRole.EDITOR;
    this.formError.set('');
    this.showForm.set(true);
  }

  editUser(user: LocalUser): void {
    this.editingUser.set(user);
    this.formName = user.name;
    this.formPhone = user.phone;
    this.formRole = user.role;
    this.formError.set('');
    this.showForm.set(true);
  }

  closeForm(): void {
    this.showForm.set(false);
    this.editingUser.set(null);
  }

  async saveUser(): Promise<void> {
    if (!this.formName.trim()) {
      this.formError.set('Name is required');
      return;
    }
    if (!this.formPhone.trim()) {
      this.formError.set('Phone is required');
      return;
    }

    const bizUuid = this.authStore.activeBusinessUuid();
    if (!bizUuid) return;

    this.saving.set(true);
    this.formError.set('');

    const editing = this.editingUser();
    const uuid = editing?.uuid || crypto.randomUUID();
    const now = Date.now();

    const user: LocalUser = {
      uuid,
      table_type: TABLE_TYPE,
      business_uuid: bizUuid,
      name: this.formName.trim(),
      phone: this.formPhone.trim(),
      role: this.formRole,
      created_at: editing?.created_at || now,
      updated_at: now,
    };

    await this.pouchDb.put(TABLE_TYPE, uuid, user as unknown as Record<string, unknown>);
    this.closeForm();
    await this.loadUsers();
    this.saving.set(false);
  }

  confirmDelete(user: LocalUser): void {
    this.deletingUser.set(user);
    this.showDeleteConfirm.set(true);
  }

  async doDelete(): Promise<void> {
    const user = this.deletingUser();
    if (user) {
      await this.pouchDb.remove(TABLE_TYPE, user.uuid);
      await this.loadUsers();
    }
    this.showDeleteConfirm.set(false);
    this.deletingUser.set(null);
  }
}
