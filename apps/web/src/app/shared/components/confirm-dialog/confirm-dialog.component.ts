import { Component, input, output } from '@angular/core';

@Component({
  selector: 'gonok-confirm-dialog',
  standalone: true,
  template: `
    @if (visible()) {
      <div class="modal-backdrop" (click)="cancelled.emit()">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal__header">
            <h3 class="modal__title">{{ title() }}</h3>
            <button class="modal__close" (click)="cancelled.emit()">&times;</button>
          </div>
          <div class="modal__body">
            <p>{{ message() }}</p>
          </div>
          <div class="modal__footer">
            <button class="btn btn--ghost" (click)="cancelled.emit()">Cancel</button>
            <button
              class="btn"
              [class.btn--danger]="variant() === 'danger'"
              [class.btn--primary]="variant() !== 'danger'"
              (click)="confirmed.emit()"
            >
              {{ confirmLabel() }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class ConfirmDialogComponent {
  visible = input(false);
  title = input('Confirm');
  message = input('Are you sure?');
  confirmLabel = input('Confirm');
  variant = input<'primary' | 'danger'>('danger');

  confirmed = output<void>();
  cancelled = output<void>();
}
