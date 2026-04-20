import { Component, inject, input, output, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CrmStore } from '../../../../core/stores/crm.store';
import { CatalogStore } from '../../../../core/stores/catalog.store';
import { ICrmNote } from '@org/shared-types';

@Component({
  selector: 'gonok-note-form',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="modal-backdrop" (click)="close.emit()">
      <div class="modal" (click)="$event.stopPropagation()">
        <div class="modal__header">
          <h3 class="modal__title">{{ editing() ? 'Edit Note' : 'New Note' }}</h3>
          <button class="modal__close" (click)="close.emit()">&times;</button>
        </div>
        <div class="modal__body">
          <div class="form-group">
            <label class="form-label">Party *</label>
            <select class="form-input" [(ngModel)]="partyUuid" name="party" [disabled]="!!editing()">
              <option value="">-- Select Party --</option>
              @for (party of catalogStore.parties(); track party.uuid) {
                <option [value]="party.uuid">{{ party.name }}</option>
              }
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Note *</label>
            <textarea class="form-input" [(ngModel)]="content" name="content" rows="5" placeholder="Write your note..."></textarea>
          </div>
          <div class="form-group">
            <label class="form-label">
              <input type="checkbox" [(ngModel)]="isPinned" name="pinned" />
              Pin this note
            </label>
          </div>
          @if (formError()) {
            <p class="form-error">{{ formError() }}</p>
          }
        </div>
        <div class="modal__footer">
          <button class="btn btn--ghost" type="button" (click)="close.emit()">Cancel</button>
          <button class="btn btn--primary" (click)="save()" [disabled]="saving()">
            {{ saving() ? 'Saving...' : 'Save' }}
          </button>
        </div>
      </div>
    </div>
  `,
})
export class NoteFormComponent implements OnInit {
  private crmStore = inject(CrmStore);
  catalogStore = inject(CatalogStore);

  editing = input<ICrmNote | null>(null);
  close = output<void>();
  saved = output<void>();

  partyUuid = '';
  content = '';
  isPinned = false;
  saving = signal(false);
  formError = signal('');

  ngOnInit(): void {
    const note = this.editing();
    if (note) {
      this.partyUuid = note.party_uuid;
      this.content = note.content;
      this.isPinned = note.is_pinned;
    }
  }

  async save(): Promise<void> {
    if (!this.partyUuid) {
      this.formError.set('Please select a party');
      return;
    }
    if (!this.content.trim()) {
      this.formError.set('Note content is required');
      return;
    }

    this.saving.set(true);
    this.formError.set('');

    try {
      const note = this.editing();
      if (note) {
        await this.crmStore.updateNote(note.uuid, {
          content: this.content.trim(),
          is_pinned: this.isPinned,
        });
      } else {
        await this.crmStore.addNote({
          party_uuid: this.partyUuid,
          content: this.content.trim(),
          is_pinned: this.isPinned,
        });
      }
      this.saved.emit();
      this.close.emit();
    } catch {
      this.formError.set('Failed to save note');
    }
    this.saving.set(false);
  }
}
