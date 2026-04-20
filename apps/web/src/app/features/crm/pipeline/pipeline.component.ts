import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { CrmStore } from '../../../core/stores/crm.store';
import { CatalogStore } from '../../../core/stores/catalog.store';
import { SearchInputComponent } from '../../../shared/components/search-input/search-input.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { OpportunityFormComponent } from './opportunity-form/opportunity-form.component';
import { ICrmOpportunity, ECrmOpportunityStage } from '@org/shared-types';

@Component({
  selector: 'gonok-crm-pipeline',
  standalone: true,
  imports: [DatePipe, DecimalPipe, SearchInputComponent, ConfirmDialogComponent, OpportunityFormComponent],
  template: `
    <div class="page-header">
      <h1 class="page-header__title">Pipeline</h1>
      <button class="btn btn--primary" (click)="openForm()">+ New Opportunity</button>
    </div>

    <!-- Stage summary cards -->
    <div class="stage-cards">
      @for (stage of stages; track stage) {
        <div class="stage-card" [class]="'stage-card--' + stage" (click)="filterStage.set(filterStage() === stage ? '' : stage)">
          <div class="stage-card__label">{{ stageLabels[stage] }}</div>
          <div class="stage-card__count">{{ getStageCount(stage) }}</div>
          <div class="stage-card__value">&#2547;{{ getStageValue(stage) | number:'1.0-0' }}</div>
        </div>
      }
    </div>

    <div class="filters">
      <gonok-search-input
        placeholder="Search by title or party..."
        (searchChange)="searchTerm.set($event)"
      />
      <select class="form-input filter-select" (change)="filterParty.set($any($event.target).value)">
        <option value="">All Parties</option>
        @for (party of catalogStore.parties(); track party.uuid) {
          <option [value]="party.uuid">{{ party.name }}</option>
        }
      </select>
    </div>

    <div class="table-wrapper">
      <table class="table">
        <thead>
          <tr>
            <th>Title</th>
            <th>Party</th>
            <th>Stage</th>
            <th class="text-right">Value (&#2547;)</th>
            <th class="text-right">Prob.</th>
            <th>Expected Close</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          @for (opp of filteredOpportunities(); track opp.uuid) {
            <tr>
              <td>{{ opp.title }}</td>
              <td>{{ getPartyName(opp.party_uuid) }}</td>
              <td>
                <span class="badge" [class]="'badge--' + opp.stage">{{ stageLabels[opp.stage] }}</span>
              </td>
              <td class="col-amount">{{ opp.estimated_value | number:'1.2-2' }}</td>
              <td class="col-amount">{{ opp.probability }}%</td>
              <td>{{ opp.expected_close_date ? (opp.expected_close_date | date:'dd/MM/yyyy') : '-' }}</td>
              <td>
                <div class="action-btns">
                  <button class="btn btn--sm btn--ghost" (click)="editOpportunity(opp)">Edit</button>
                  <button class="btn btn--sm btn--ghost btn--danger-text" (click)="confirmDelete(opp)">Delete</button>
                </div>
              </td>
            </tr>
          } @empty {
            <tr>
              <td colspan="7" class="text-center text-muted">No opportunities in the pipeline yet.</td>
            </tr>
          }
        </tbody>
      </table>
    </div>

    <div class="summary-bar">
      Active Pipeline: &#2547;{{ crmStore.totalPipelineValue() | number:'1.0-0' }}
      &middot; Total Opportunities: {{ crmStore.opportunities().length }}
    </div>

    @if (showForm()) {
      <gonok-opportunity-form
        [editing]="editingOpportunity()"
        (close)="closeForm()"
        (saved)="closeForm()"
      />
    }

    <gonok-confirm-dialog
      [visible]="showDeleteConfirm()"
      title="Delete Opportunity"
      message="Delete this opportunity? This cannot be undone."
      confirmLabel="Delete"
      variant="danger"
      (confirmed)="doDelete()"
      (cancelled)="showDeleteConfirm.set(false)"
    />
  `,
  styles: `
    @use '../../../../styles/abstracts/variables' as *;

    .stage-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: $space-3;
      margin-bottom: $space-4;
    }
    .stage-card {
      padding: $space-3;
      border-radius: $radius-md;
      text-align: center;
      cursor: pointer;
      border: 2px solid transparent;
      transition: border-color $transition-base;
      &:hover { opacity: 0.9; }
    }
    .stage-card--lead { background: #e3f2fd; color: #1565c0; }
    .stage-card--proposal { background: #fff3e0; color: #e65100; }
    .stage-card--negotiation { background: #f3e5f5; color: #6a1b9a; }
    .stage-card--won { background: #e8f5e9; color: #2e7d32; }
    .stage-card--lost { background: #fce4ec; color: #c62828; }
    .stage-card__label {
      font-size: $font-size-xs;
      font-weight: $font-weight-semibold;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .stage-card__count {
      font-size: $font-size-2xl;
      font-weight: $font-weight-bold;
      margin: $space-1 0;
    }
    .stage-card__value {
      font-size: $font-size-sm;
    }
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
    .badge--lead { background: #e3f2fd; color: #1565c0; }
    .badge--proposal { background: #fff3e0; color: #e65100; }
    .badge--negotiation { background: #f3e5f5; color: #6a1b9a; }
    .badge--won { background: #e8f5e9; color: #2e7d32; }
    .badge--lost { background: #fce4ec; color: #c62828; }
  `,
})
export class PipelineComponent implements OnInit {
  crmStore = inject(CrmStore);
  catalogStore = inject(CatalogStore);

  stages = Object.values(ECrmOpportunityStage);
  stageLabels: Record<string, string> = {
    [ECrmOpportunityStage.LEAD]: 'Lead',
    [ECrmOpportunityStage.PROPOSAL]: 'Proposal',
    [ECrmOpportunityStage.NEGOTIATION]: 'Negotiation',
    [ECrmOpportunityStage.WON]: 'Won',
    [ECrmOpportunityStage.LOST]: 'Lost',
  };

  searchTerm = signal('');
  filterParty = signal('');
  filterStage = signal('');
  showForm = signal(false);
  editingOpportunity = signal<ICrmOpportunity | null>(null);
  showDeleteConfirm = signal(false);
  deletingOpportunity = signal<ICrmOpportunity | null>(null);

  filteredOpportunities = computed(() => {
    const term = this.searchTerm().toLowerCase();
    const partyUuid = this.filterParty();
    const stage = this.filterStage();
    let opps = [...this.crmStore.opportunities()].sort(
      (a, b) => b.created_at - a.created_at,
    );

    if (stage) {
      opps = opps.filter((o) => o.stage === stage);
    }
    if (partyUuid) {
      opps = opps.filter((o) => o.party_uuid === partyUuid);
    }
    if (term) {
      opps = opps.filter(
        (o) =>
          o.title.toLowerCase().includes(term) ||
          this.getPartyName(o.party_uuid).toLowerCase().includes(term),
      );
    }
    return opps;
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

  getStageCount(stage: string): number {
    return this.crmStore.opportunities().filter((o) => o.stage === stage).length;
  }

  getStageValue(stage: string): number {
    return this.crmStore
      .opportunities()
      .filter((o) => o.stage === stage)
      .reduce((s, o) => s + o.estimated_value, 0);
  }

  openForm(): void {
    this.editingOpportunity.set(null);
    this.showForm.set(true);
  }

  editOpportunity(opp: ICrmOpportunity): void {
    this.editingOpportunity.set(opp);
    this.showForm.set(true);
  }

  closeForm(): void {
    this.showForm.set(false);
    this.editingOpportunity.set(null);
  }

  confirmDelete(opp: ICrmOpportunity): void {
    this.deletingOpportunity.set(opp);
    this.showDeleteConfirm.set(true);
  }

  async doDelete(): Promise<void> {
    const opp = this.deletingOpportunity();
    if (opp) {
      await this.crmStore.deleteOpportunity(opp.uuid);
    }
    this.showDeleteConfirm.set(false);
    this.deletingOpportunity.set(null);
  }
}
