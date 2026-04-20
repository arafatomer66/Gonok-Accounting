import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { CrmStore } from '../../../core/stores/crm.store';
import { CatalogStore } from '../../../core/stores/catalog.store';
import { SearchInputComponent } from '../../../shared/components/search-input/search-input.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { InteractionFormComponent } from './interaction-form/interaction-form.component';
import { ICrmInteraction, ECrmInteractionType } from '@org/shared-types';

@Component({
  selector: 'gonok-crm-interactions',
  standalone: true,
  imports: [DatePipe, SearchInputComponent, ConfirmDialogComponent, InteractionFormComponent],
  template: `
    <div class="page-header">
      <h1 class="page-header__title">Interactions</h1>
      <button class="btn btn--primary" (click)="openForm()">+ Log Interaction</button>
    </div>

    <div class="filters">
      <gonok-search-input
        placeholder="Search by subject or party..."
        (searchChange)="searchTerm.set($event)"
      />
      <select class="form-input filter-select" (change)="filterParty.set($any($event.target).value)">
        <option value="">All Parties</option>
        @for (party of catalogStore.parties(); track party.uuid) {
          <option [value]="party.uuid">{{ party.name }}</option>
        }
      </select>
      <select class="form-input filter-select" (change)="filterType.set($any($event.target).value)">
        <option value="">All Types</option>
        <option value="call">Phone Call</option>
        <option value="email">Email</option>
        <option value="meeting">Meeting</option>
        <option value="visit">Visit</option>
      </select>
    </div>

    <div class="table-wrapper">
      <table class="table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Party</th>
            <th>Type</th>
            <th>Subject</th>
            <th>Duration</th>
            <th>Follow-up</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          @for (i of filteredInteractions(); track i.uuid) {
            <tr>
              <td>{{ i.interaction_date | date:'dd/MM/yyyy' }}</td>
              <td>{{ getPartyName(i.party_uuid) }}</td>
              <td>
                <span class="badge" [class]="'badge--' + i.interaction_type">{{ typeLabels[i.interaction_type] }}</span>
              </td>
              <td>{{ i.subject || '-' }}</td>
              <td>{{ i.duration_minutes ? i.duration_minutes + ' min' : '-' }}</td>
              <td>
                @if (i.next_followup_date) {
                  <span [class.overdue]="isOverdue(i)" [class.completed]="i.followup_completed">
                    {{ i.next_followup_date | date:'dd/MM/yyyy' }}
                    @if (i.followup_completed) { &#10003; }
                  </span>
                } @else {
                  -
                }
              </td>
              <td>
                <div class="action-btns">
                  <button class="btn btn--sm btn--ghost" (click)="editInteraction(i)">Edit</button>
                  <button class="btn btn--sm btn--ghost btn--danger-text" (click)="confirmDelete(i)">Delete</button>
                </div>
              </td>
            </tr>
          } @empty {
            <tr>
              <td colspan="7" class="text-center text-muted">No interactions logged yet.</td>
            </tr>
          }
        </tbody>
      </table>
    </div>

    <div class="summary-bar">
      Total Interactions: {{ crmStore.interactions().length }}
    </div>

    @if (showForm()) {
      <gonok-interaction-form
        [editing]="editingInteraction()"
        (close)="closeForm()"
        (saved)="closeForm()"
      />
    }

    <gonok-confirm-dialog
      [visible]="showDeleteConfirm()"
      title="Delete Interaction"
      message="Delete this interaction? This cannot be undone."
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
      flex-wrap: wrap;
    }
    .filter-select { max-width: 200px; }
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
    .badge--call { background: #e3f2fd; color: #1565c0; }
    .badge--email { background: #fce4ec; color: #c62828; }
    .badge--meeting { background: #e8f5e9; color: #2e7d32; }
    .badge--visit { background: #fff3e0; color: #e65100; }
    .overdue { color: $color-danger; font-weight: $font-weight-semibold; }
    .completed { color: $color-text-secondary; text-decoration: line-through; }
  `,
})
export class InteractionsComponent implements OnInit {
  crmStore = inject(CrmStore);
  catalogStore = inject(CatalogStore);

  searchTerm = signal('');
  filterParty = signal('');
  filterType = signal('');
  showForm = signal(false);
  editingInteraction = signal<ICrmInteraction | null>(null);
  showDeleteConfirm = signal(false);
  deletingInteraction = signal<ICrmInteraction | null>(null);

  typeLabels: Record<string, string> = {
    [ECrmInteractionType.CALL]: 'Call',
    [ECrmInteractionType.EMAIL]: 'Email',
    [ECrmInteractionType.MEETING]: 'Meeting',
    [ECrmInteractionType.VISIT]: 'Visit',
  };

  filteredInteractions = computed(() => {
    const term = this.searchTerm().toLowerCase();
    const partyUuid = this.filterParty();
    const type = this.filterType();
    let interactions = [...this.crmStore.interactions()].sort(
      (a, b) => b.interaction_date - a.interaction_date,
    );

    if (partyUuid) {
      interactions = interactions.filter((i) => i.party_uuid === partyUuid);
    }
    if (type) {
      interactions = interactions.filter((i) => i.interaction_type === type);
    }
    if (term) {
      interactions = interactions.filter(
        (i) =>
          (i.subject || '').toLowerCase().includes(term) ||
          (i.description || '').toLowerCase().includes(term) ||
          this.getPartyName(i.party_uuid).toLowerCase().includes(term),
      );
    }
    return interactions;
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

  isOverdue(interaction: ICrmInteraction): boolean {
    if (!interaction.next_followup_date || interaction.followup_completed) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return interaction.next_followup_date < today.getTime();
  }

  openForm(): void {
    this.editingInteraction.set(null);
    this.showForm.set(true);
  }

  editInteraction(interaction: ICrmInteraction): void {
    this.editingInteraction.set(interaction);
    this.showForm.set(true);
  }

  closeForm(): void {
    this.showForm.set(false);
    this.editingInteraction.set(null);
  }

  confirmDelete(interaction: ICrmInteraction): void {
    this.deletingInteraction.set(interaction);
    this.showDeleteConfirm.set(true);
  }

  async doDelete(): Promise<void> {
    const interaction = this.deletingInteraction();
    if (interaction) {
      await this.crmStore.deleteInteraction(interaction.uuid);
    }
    this.showDeleteConfirm.set(false);
    this.deletingInteraction.set(null);
  }
}
