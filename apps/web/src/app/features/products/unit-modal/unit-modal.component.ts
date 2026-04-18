import { Component, inject, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CatalogStore } from '../../../core/stores/catalog.store';
import { IUnit } from '@org/shared-types';

@Component({
  selector: 'gonok-unit-modal',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="modal-backdrop" (click)="closed.emit()">
      <div class="modal" (click)="$event.stopPropagation()">
        <div class="modal__header">
          <h3 class="modal__title">New Unit</h3>
          <button class="modal__close" (click)="closed.emit()">&times;</button>
        </div>
        <form (ngSubmit)="save()" class="modal__body">
          <div class="form-group">
            <label class="form-label">Full Name</label>
            <input
              class="form-input"
              type="text"
              [(ngModel)]="fullname"
              name="fullname"
              placeholder="e.g. Kilogram"
              required
            />
          </div>
          <div class="form-group">
            <label class="form-label">Short Name</label>
            <input
              class="form-input"
              type="text"
              [(ngModel)]="shortname"
              name="shortname"
              placeholder="e.g. kg"
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
export class UnitModalComponent {
  private catalogStore = inject(CatalogStore);

  created = output<IUnit>();
  closed = output<void>();

  fullname = '';
  shortname = '';
  saving = signal(false);
  error = signal('');

  async save(): Promise<void> {
    if (!this.fullname.trim() || !this.shortname.trim()) {
      this.error.set('Both full name and short name are required');
      return;
    }

    const exists = this.catalogStore
      .units()
      .some(
        (u) =>
          u.shortname?.toLowerCase() ===
          this.shortname.trim().toLowerCase(),
      );
    if (exists) {
      this.error.set('Unit with this short name already exists');
      return;
    }

    this.saving.set(true);
    this.error.set('');

    try {
      const unit = await this.catalogStore.addUnit({
        fullname: this.fullname.trim(),
        shortname: this.shortname.trim(),
      });
      this.created.emit(unit);
    } catch (err) {
      this.error.set('Failed to save unit');
      this.saving.set(false);
    }
  }
}
