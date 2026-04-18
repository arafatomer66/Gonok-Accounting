import { Component, inject, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CatalogStore } from '../../../core/stores/catalog.store';
import { ICategory } from '@org/shared-types';

@Component({
  selector: 'gonok-category-modal',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="modal-backdrop" (click)="closed.emit()">
      <div class="modal" (click)="$event.stopPropagation()">
        <div class="modal__header">
          <h3 class="modal__title">New Category</h3>
          <button class="modal__close" (click)="closed.emit()">&times;</button>
        </div>
        <form (ngSubmit)="save()" class="modal__body">
          <div class="form-group">
            <label class="form-label">Category Name</label>
            <input
              class="form-input"
              type="text"
              [(ngModel)]="name"
              name="name"
              placeholder="e.g. Electronics"
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
export class CategoryModalComponent {
  private catalogStore = inject(CatalogStore);

  created = output<ICategory>();
  closed = output<void>();

  name = '';
  saving = signal(false);
  error = signal('');

  async save(): Promise<void> {
    if (!this.name.trim()) {
      this.error.set('Category name is required');
      return;
    }

    const exists = this.catalogStore
      .categories()
      .some(
        (c) =>
          c.name?.toLowerCase() === this.name.trim().toLowerCase(),
      );
    if (exists) {
      this.error.set('Category already exists');
      return;
    }

    this.saving.set(true);
    this.error.set('');

    try {
      const category = await this.catalogStore.addCategory({
        name: this.name.trim(),
      });
      this.created.emit(category);
    } catch (err) {
      this.error.set('Failed to save category');
      this.saving.set(false);
    }
  }
}
