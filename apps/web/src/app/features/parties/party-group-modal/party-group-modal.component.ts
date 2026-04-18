import { Component, inject, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CatalogStore } from '../../../core/stores/catalog.store';
import { IPartyGroup } from '@org/shared-types';

@Component({
  selector: 'gonok-party-group-modal',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="modal-backdrop" (click)="closed.emit()">
      <div class="modal" (click)="$event.stopPropagation()">
        <div class="modal__header">
          <h3 class="modal__title">New Party Group</h3>
          <button class="modal__close" (click)="closed.emit()">&times;</button>
        </div>
        <form (ngSubmit)="save()" class="modal__body">
          <div class="form-group">
            <label class="form-label">Group Name</label>
            <input
              class="form-input"
              type="text"
              [(ngModel)]="name"
              name="name"
              placeholder="e.g. Retail Customers"
              required
            />
          </div>
          @if (error()) {
            <p class="form-error">{{ error() }}</p>
          }
        </form>
        <div class="modal__footer">
          <button class="btn btn--ghost" type="button" (click)="closed.emit()">Cancel</button>
          <button class="btn btn--primary" (click)="save()" [disabled]="saving()">
            {{ saving() ? 'Saving...' : 'Save' }}
          </button>
        </div>
      </div>
    </div>
  `,
})
export class PartyGroupModalComponent {
  private catalogStore = inject(CatalogStore);

  created = output<IPartyGroup>();
  closed = output<void>();

  name = '';
  saving = signal(false);
  error = signal('');

  async save(): Promise<void> {
    if (!this.name.trim()) {
      this.error.set('Group name is required');
      return;
    }

    const exists = this.catalogStore
      .allPartyGroups()
      .some(
        (g) =>
          g.name?.toLowerCase() === this.name.trim().toLowerCase(),
      );
    if (exists) {
      this.error.set('Group already exists');
      return;
    }

    this.saving.set(true);
    this.error.set('');

    try {
      const group = await this.catalogStore.addPartyGroup({
        name: this.name.trim(),
      });
      this.created.emit(group);
    } catch (err) {
      this.error.set('Failed to save group');
      this.saving.set(false);
    }
  }
}
