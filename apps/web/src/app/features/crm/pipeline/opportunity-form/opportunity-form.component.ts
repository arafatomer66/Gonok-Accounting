import { Component, inject, input, output, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CrmStore } from '../../../../core/stores/crm.store';
import { CatalogStore } from '../../../../core/stores/catalog.store';
import { ICrmOpportunity, ECrmOpportunityStage } from '@org/shared-types';

@Component({
  selector: 'gonok-opportunity-form',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="modal-backdrop" (click)="close.emit()">
      <div class="modal" (click)="$event.stopPropagation()">
        <div class="modal__header">
          <h3 class="modal__title">{{ editing() ? 'Edit Opportunity' : 'New Opportunity' }}</h3>
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
              <label class="form-label">Stage *</label>
              <select class="form-input" [(ngModel)]="stage" name="stage">
                @for (s of stages; track s) {
                  <option [value]="s">{{ stageLabels[s] }}</option>
                }
              </select>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Title *</label>
            <input class="form-input" type="text" [(ngModel)]="title" name="title" placeholder="Deal title" />
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Estimated Value (&#2547;)</label>
              <input class="form-input" type="number" [(ngModel)]="estimatedValue" name="value" min="0" step="0.01" />
            </div>
            <div class="form-group">
              <label class="form-label">Probability (%)</label>
              <input class="form-input" type="number" [(ngModel)]="probability" name="prob" min="0" max="100" />
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Expected Close Date</label>
            <input class="form-input" type="date" [(ngModel)]="expectedCloseDate" name="closeDate" />
          </div>
          <div class="form-group">
            <label class="form-label">Notes</label>
            <textarea class="form-input" [(ngModel)]="notes" name="notes" rows="3" placeholder="Additional notes..."></textarea>
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
export class OpportunityFormComponent implements OnInit {
  private crmStore = inject(CrmStore);
  catalogStore = inject(CatalogStore);

  editing = input<ICrmOpportunity | null>(null);
  close = output<void>();
  saved = output<void>();

  stages = Object.values(ECrmOpportunityStage);
  stageLabels: Record<string, string> = {
    [ECrmOpportunityStage.LEAD]: 'Lead',
    [ECrmOpportunityStage.PROPOSAL]: 'Proposal',
    [ECrmOpportunityStage.NEGOTIATION]: 'Negotiation',
    [ECrmOpportunityStage.WON]: 'Won',
    [ECrmOpportunityStage.LOST]: 'Lost',
  };

  partyUuid = '';
  stage: ECrmOpportunityStage = ECrmOpportunityStage.LEAD;
  title = '';
  estimatedValue = 0;
  probability = 0;
  expectedCloseDate = '';
  notes = '';
  saving = signal(false);
  formError = signal('');

  ngOnInit(): void {
    const opp = this.editing();
    if (opp) {
      this.partyUuid = opp.party_uuid;
      this.stage = opp.stage;
      this.title = opp.title;
      this.estimatedValue = opp.estimated_value;
      this.probability = opp.probability;
      this.expectedCloseDate = opp.expected_close_date
        ? new Date(opp.expected_close_date).toISOString().split('T')[0]
        : '';
      this.notes = opp.notes || '';
    }
  }

  async save(): Promise<void> {
    if (!this.partyUuid) {
      this.formError.set('Please select a party');
      return;
    }
    if (!this.title.trim()) {
      this.formError.set('Title is required');
      return;
    }

    this.saving.set(true);
    this.formError.set('');

    const data: Partial<ICrmOpportunity> = {
      party_uuid: this.partyUuid,
      title: this.title.trim(),
      stage: this.stage,
      estimated_value: this.estimatedValue || 0,
      probability: Math.min(100, Math.max(0, this.probability || 0)),
      expected_close_date: this.expectedCloseDate
        ? new Date(this.expectedCloseDate).getTime()
        : null,
      notes: this.notes.trim() || null,
    };

    try {
      const opp = this.editing();
      if (opp) {
        await this.crmStore.updateOpportunity(opp.uuid, data);
      } else {
        await this.crmStore.addOpportunity(data);
      }
      this.saved.emit();
      this.close.emit();
    } catch {
      this.formError.set('Failed to save opportunity');
    }
    this.saving.set(false);
  }
}
