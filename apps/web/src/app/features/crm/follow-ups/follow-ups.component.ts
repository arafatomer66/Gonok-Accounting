import { Component, inject, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { CrmStore } from '../../../core/stores/crm.store';
import { CatalogStore } from '../../../core/stores/catalog.store';
import { ECrmInteractionType } from '@org/shared-types';

@Component({
  selector: 'gonok-crm-follow-ups',
  standalone: true,
  imports: [DatePipe],
  template: `
    <div class="page-header">
      <h1 class="page-header__title">Follow-ups</h1>
    </div>

    <!-- Overdue -->
    <h2 class="section-title section-title--danger">
      Overdue ({{ crmStore.overdueFollowups().length }})
    </h2>
    @if (crmStore.overdueFollowups().length > 0) {
      <div class="table-wrapper">
        <table class="table">
          <thead>
            <tr>
              <th>Follow-up Date</th>
              <th>Party</th>
              <th>Type</th>
              <th>Subject</th>
              <th>Interaction Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            @for (i of crmStore.overdueFollowups(); track i.uuid) {
              <tr class="row--overdue">
                <td class="text-danger">{{ i.next_followup_date | date:'dd/MM/yyyy' }}</td>
                <td>{{ getPartyName(i.party_uuid) }}</td>
                <td>
                  <span class="badge" [class]="'badge--' + i.interaction_type">{{ typeLabels[i.interaction_type] }}</span>
                </td>
                <td>{{ i.subject || '-' }}</td>
                <td>{{ i.interaction_date | date:'dd/MM/yyyy' }}</td>
                <td>
                  <button class="btn btn--sm btn--primary" (click)="markComplete(i.uuid)">Mark Complete</button>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    } @else {
      <p class="text-muted empty-msg">No overdue follow-ups. You're all caught up!</p>
    }

    <!-- Upcoming -->
    <h2 class="section-title section-title--info">
      Upcoming ({{ crmStore.upcomingFollowups().length }})
    </h2>
    @if (crmStore.upcomingFollowups().length > 0) {
      <div class="table-wrapper">
        <table class="table">
          <thead>
            <tr>
              <th>Follow-up Date</th>
              <th>Party</th>
              <th>Type</th>
              <th>Subject</th>
              <th>Interaction Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            @for (i of crmStore.upcomingFollowups(); track i.uuid) {
              <tr>
                <td>{{ i.next_followup_date | date:'dd/MM/yyyy' }}</td>
                <td>{{ getPartyName(i.party_uuid) }}</td>
                <td>
                  <span class="badge" [class]="'badge--' + i.interaction_type">{{ typeLabels[i.interaction_type] }}</span>
                </td>
                <td>{{ i.subject || '-' }}</td>
                <td>{{ i.interaction_date | date:'dd/MM/yyyy' }}</td>
                <td>
                  <button class="btn btn--sm btn--primary" (click)="markComplete(i.uuid)">Mark Complete</button>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    } @else {
      <p class="text-muted empty-msg">No upcoming follow-ups scheduled.</p>
    }
  `,
  styles: `
    @use '../../../../styles/abstracts/variables' as *;

    .section-title {
      font-size: $font-size-lg;
      font-weight: $font-weight-semibold;
      margin: $space-5 0 $space-3 0;
      &:first-of-type { margin-top: 0; }
    }
    .section-title--danger { color: $color-danger; }
    .section-title--info { color: $color-primary; }
    .row--overdue { background: rgba($color-danger, 0.04); }
    .text-danger { color: $color-danger; font-weight: $font-weight-semibold; }
    .text-muted { color: $color-text-secondary; }
    .empty-msg {
      padding: $space-4;
      background: $color-gray-50;
      border-radius: $radius-md;
      text-align: center;
    }
    .badge--call { background: #e3f2fd; color: #1565c0; }
    .badge--email { background: #fce4ec; color: #c62828; }
    .badge--meeting { background: #e8f5e9; color: #2e7d32; }
    .badge--visit { background: #fff3e0; color: #e65100; }
  `,
})
export class FollowUpsComponent implements OnInit {
  crmStore = inject(CrmStore);
  private catalogStore = inject(CatalogStore);

  typeLabels: Record<string, string> = {
    [ECrmInteractionType.CALL]: 'Call',
    [ECrmInteractionType.EMAIL]: 'Email',
    [ECrmInteractionType.MEETING]: 'Meeting',
    [ECrmInteractionType.VISIT]: 'Visit',
  };

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

  markComplete(uuid: string): void {
    this.crmStore.completeFollowup(uuid);
  }
}
