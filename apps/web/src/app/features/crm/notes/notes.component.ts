import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { CrmStore } from '../../../core/stores/crm.store';
import { CatalogStore } from '../../../core/stores/catalog.store';
import { SearchInputComponent } from '../../../shared/components/search-input/search-input.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { NoteFormComponent } from './note-form/note-form.component';
import { ICrmNote } from '@org/shared-types';

@Component({
  selector: 'gonok-crm-notes',
  standalone: true,
  imports: [DatePipe, SearchInputComponent, ConfirmDialogComponent, NoteFormComponent],
  template: `
    <div class="page-header">
      <h1 class="page-header__title">Notes</h1>
      <button class="btn btn--primary" (click)="openForm()">+ New Note</button>
    </div>

    <div class="filters">
      <gonok-search-input
        placeholder="Search notes..."
        (searchChange)="searchTerm.set($event)"
      />
      <select class="form-input filter-select" (change)="filterParty.set($any($event.target).value)">
        <option value="">All Parties</option>
        @for (party of catalogStore.parties(); track party.uuid) {
          <option [value]="party.uuid">{{ party.name }}</option>
        }
      </select>
    </div>

    <div class="notes-grid">
      @for (note of filteredNotes(); track note.uuid) {
        <div class="note-card" [class.note-card--pinned]="note.is_pinned">
          <div class="note-card__header">
            <span class="note-card__party">{{ getPartyName(note.party_uuid) }}</span>
            <div class="note-card__actions">
              <button class="btn btn--sm btn--ghost" (click)="crmStore.toggleNotePin(note.uuid)"
                [title]="note.is_pinned ? 'Unpin' : 'Pin'">
                {{ note.is_pinned ? '&#128204;' : '&#128205;' }}
              </button>
              <button class="btn btn--sm btn--ghost" (click)="editNote(note)">Edit</button>
              <button class="btn btn--sm btn--ghost btn--danger-text" (click)="confirmDelete(note)">Delete</button>
            </div>
          </div>
          <div class="note-card__body">{{ note.content }}</div>
          <div class="note-card__footer">
            {{ note.created_at | date:'dd/MM/yyyy HH:mm' }}
          </div>
        </div>
      } @empty {
        <p class="text-muted">No notes found.</p>
      }
    </div>

    @if (showForm()) {
      <gonok-note-form
        [editing]="editingNote()"
        (close)="closeForm()"
        (saved)="closeForm()"
      />
    }

    <gonok-confirm-dialog
      [visible]="showDeleteConfirm()"
      title="Delete Note"
      message="Delete this note? This cannot be undone."
      confirmLabel="Delete"
      variant="danger"
      (confirmed)="doDelete()"
      (cancelled)="showDeleteConfirm.set(false)"
    />
  `,
  styles: `
    @use '../../../../styles/abstracts/variables' as *;

    .filters {
      display: flex;
      gap: $space-3;
      margin-bottom: $space-4;
      align-items: center;
    }
    .filter-select { max-width: 220px; }
    .notes-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: $space-4;
    }
    .note-card {
      background: white;
      border: 1px solid $color-border;
      border-radius: $radius-lg;
      padding: $space-4;
      display: flex;
      flex-direction: column;
      gap: $space-2;
    }
    .note-card--pinned {
      border-color: $color-primary;
      box-shadow: 0 1px 4px rgba($color-primary, 0.12);
    }
    .note-card__header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .note-card__party {
      font-weight: $font-weight-semibold;
      font-size: $font-size-sm;
      color: $color-primary;
    }
    .note-card__actions {
      display: flex;
      gap: $space-1;
    }
    .note-card__body {
      font-size: $font-size-base;
      white-space: pre-wrap;
      flex: 1;
    }
    .note-card__footer {
      font-size: $font-size-xs;
      color: $color-text-secondary;
    }
    .btn--danger-text {
      color: $color-danger;
      &:hover { background: rgba($color-danger, 0.08); }
    }
    .text-muted { color: $color-text-secondary; }
  `,
})
export class NotesComponent implements OnInit {
  crmStore = inject(CrmStore);
  catalogStore = inject(CatalogStore);

  searchTerm = signal('');
  filterParty = signal('');
  showForm = signal(false);
  editingNote = signal<ICrmNote | null>(null);
  showDeleteConfirm = signal(false);
  deletingNote = signal<ICrmNote | null>(null);

  filteredNotes = computed(() => {
    const term = this.searchTerm().toLowerCase();
    const partyUuid = this.filterParty();
    let notes = this.crmStore.notes();

    // Show pinned first
    notes = [...notes].sort((a, b) => {
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;
      return b.created_at - a.created_at;
    });

    if (partyUuid) {
      notes = notes.filter((n) => n.party_uuid === partyUuid);
    }
    if (term) {
      notes = notes.filter(
        (n) =>
          n.content.toLowerCase().includes(term) ||
          this.getPartyName(n.party_uuid).toLowerCase().includes(term),
      );
    }
    return notes;
  });

  ngOnInit(): void {
    if (!this.crmStore.initialized()) {
      this.crmStore.loadAll();
    }
    if (!this.catalogStore.initialized()) {
      this.catalogStore.loadAll();
    }
  }

  getPartyName(uuid: string): string {
    const party = this.catalogStore.parties().find((p) => p.uuid === uuid);
    return party?.name || 'Unknown';
  }

  openForm(): void {
    this.editingNote.set(null);
    this.showForm.set(true);
  }

  editNote(note: ICrmNote): void {
    this.editingNote.set(note);
    this.showForm.set(true);
  }

  closeForm(): void {
    this.showForm.set(false);
    this.editingNote.set(null);
  }

  confirmDelete(note: ICrmNote): void {
    this.deletingNote.set(note);
    this.showDeleteConfirm.set(true);
  }

  async doDelete(): Promise<void> {
    const note = this.deletingNote();
    if (note) {
      await this.crmStore.deleteNote(note.uuid);
    }
    this.showDeleteConfirm.set(false);
    this.deletingNote.set(null);
  }
}
