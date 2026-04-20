import { Component, inject, input, output, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CrmStore } from '../../../../core/stores/crm.store';
import { CatalogStore } from '../../../../core/stores/catalog.store';
import { ICrmInteraction, ECrmInteractionType } from '@org/shared-types';

@Component({
  selector: 'gonok-interaction-form',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="modal-backdrop" (click)="close.emit()">
      <div class="modal" (click)="$event.stopPropagation()">
        <div class="modal__header">
          <h3 class="modal__title">{{ editing() ? 'Edit Interaction' : 'Log Interaction' }}</h3>
          <button class="modal__close" (click)="close.emit()">&times;</button>
        </div>
        <div class="modal__body">
          <div class="form-row">
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
              <label class="form-label">Type *</label>
              <select class="form-input" [(ngModel)]="interactionType" name="type">
                @for (t of interactionTypes; track t) {
                  <option [value]="t">{{ typeLabels[t] }}</option>
                }
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Date *</label>
              <input class="form-input" type="date" [(ngModel)]="interactionDate" name="date" />
            </div>
            <div class="form-group">
              <label class="form-label">Duration (minutes)</label>
              <input class="form-input" type="number" [(ngModel)]="durationMinutes" name="duration" min="0" />
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Subject</label>
            <input class="form-input" type="text" [(ngModel)]="subject" name="subject" placeholder="Brief subject line" />
          </div>
          <div class="form-group">
            <label class="form-label">Description</label>
            <textarea class="form-input" [(ngModel)]="description" name="description" rows="3" placeholder="Details of the interaction..."></textarea>
          </div>
          <div class="form-group">
            <label class="form-label">Next Follow-up Date</label>
            <input class="form-input" type="date" [(ngModel)]="followupDate" name="followup" />
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
  styles: `
    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
      margin-bottom: 1rem;
    }
    @media (max-width: 640px) {
      .form-row { grid-template-columns: 1fr; }
    }
  `,
})
export class InteractionFormComponent implements OnInit {
  private crmStore = inject(CrmStore);
  catalogStore = inject(CatalogStore);

  editing = input<ICrmInteraction | null>(null);
  close = output<void>();
  saved = output<void>();

  interactionTypes = Object.values(ECrmInteractionType);
  typeLabels: Record<string, string> = {
    [ECrmInteractionType.CALL]: 'Phone Call',
    [ECrmInteractionType.EMAIL]: 'Email',
    [ECrmInteractionType.MEETING]: 'Meeting',
    [ECrmInteractionType.VISIT]: 'Visit',
  };

  partyUuid = '';
  interactionType: ECrmInteractionType = ECrmInteractionType.CALL;
  interactionDate = new Date().toISOString().split('T')[0];
  durationMinutes = 0;
  subject = '';
  description = '';
  followupDate = '';
  saving = signal(false);
  formError = signal('');

  ngOnInit(): void {
    const interaction = this.editing();
    if (interaction) {
      this.partyUuid = interaction.party_uuid;
      this.interactionType = interaction.interaction_type;
      this.interactionDate = new Date(interaction.interaction_date).toISOString().split('T')[0];
      this.durationMinutes = interaction.duration_minutes;
      this.subject = interaction.subject || '';
      this.description = interaction.description || '';
      this.followupDate = interaction.next_followup_date
        ? new Date(interaction.next_followup_date).toISOString().split('T')[0]
        : '';
    }
  }

  async save(): Promise<void> {
    if (!this.partyUuid) {
      this.formError.set('Please select a party');
      return;
    }
    if (!this.interactionDate) {
      this.formError.set('Date is required');
      return;
    }

    this.saving.set(true);
    this.formError.set('');

    const data: Partial<ICrmInteraction> = {
      party_uuid: this.partyUuid,
      interaction_type: this.interactionType,
      interaction_date: new Date(this.interactionDate).getTime(),
      duration_minutes: this.durationMinutes || 0,
      subject: this.subject.trim() || null,
      description: this.description.trim() || null,
      next_followup_date: this.followupDate
        ? new Date(this.followupDate).getTime()
        : null,
    };

    try {
      const interaction = this.editing();
      if (interaction) {
        await this.crmStore.updateInteraction(interaction.uuid, data);
      } else {
        await this.crmStore.addInteraction(data);
      }
      this.saved.emit();
      this.close.emit();
    } catch {
      this.formError.set('Failed to save interaction');
    }
    this.saving.set(false);
  }
}
