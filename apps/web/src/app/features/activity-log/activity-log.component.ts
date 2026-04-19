import { Component, inject, signal, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivityLogService, IActivityLog } from '../../core/services/activity-log.service';

@Component({
  selector: 'gonok-activity-log',
  standalone: true,
  imports: [DatePipe, FormsModule],
  template: `
    <div class="page-header">
      <h1 class="page-header__title">Activity Log</h1>
      <div class="page-header__actions">
        <select class="form-input form-input--sm" [(ngModel)]="filterAction" name="action" (ngModelChange)="applyFilter()">
          <option value="">All Actions</option>
          <option value="create">Created</option>
          <option value="update">Updated</option>
          <option value="delete">Deleted</option>
        </select>
        <input
          class="form-input form-input--sm"
          type="text"
          [(ngModel)]="searchTerm"
          name="search"
          placeholder="Search..."
          (input)="applyFilter()"
        />
      </div>
    </div>

    @if (loading()) {
      <p class="text-muted">Loading activity log...</p>
    } @else if (filtered().length === 0) {
      <div class="empty-state">
        <p>No activity recorded yet.</p>
        <small>Actions like creating, editing, or deleting records will appear here.</small>
      </div>
    } @else {
      <div class="timeline">
        @for (log of filtered(); track log.uuid) {
          <div class="timeline-item">
            <div class="timeline-icon" [class]="'timeline-icon--' + log.action">
              @switch (log.action) {
                @case ('create') { + }
                @case ('update') { ✎ }
                @case ('delete') { × }
              }
            </div>
            <div class="timeline-content">
              <div class="timeline-header">
                <span class="timeline-action">
                  <strong>{{ log.user_name }}</strong>
                  {{ getActionLabel(log.action) }}
                  <span class="timeline-entity">{{ log.entity_type }}</span>
                </span>
                <span class="timeline-time">{{ log.timestamp | date:'dd/MM/yyyy hh:mm a' }}</span>
              </div>
              <div class="timeline-name">{{ log.entity_name }}</div>
              @if (log.details) {
                <div class="timeline-details">{{ log.details }}</div>
              }
            </div>
          </div>
        }
      </div>

      <div class="summary-bar">
        Showing {{ filtered().length }} of {{ allLogs().length }} activities
      </div>
    }
  `,
  styles: `
    @use '../../../styles/abstracts/variables' as *;

    .page-header__actions {
      display: flex;
      gap: $space-2;
      .form-input--sm { width: 160px; }
    }

    .empty-state {
      text-align: center;
      padding: $space-8;
      color: $color-text-secondary;
      small { display: block; margin-top: $space-2; }
    }

    .timeline {
      display: flex;
      flex-direction: column;
      gap: $space-1;
    }

    .timeline-item {
      display: flex;
      gap: $space-4;
      padding: $space-4;
      background: $color-surface;
      border-radius: $radius-lg;
      border: 1px solid $color-border;
      transition: box-shadow 150ms ease;
      &:hover { box-shadow: $shadow-sm; }
    }

    .timeline-icon {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: $font-size-base;
      font-weight: $font-weight-bold;
      flex-shrink: 0;

      &--create { background: #dcfce7; color: #16a34a; }
      &--update { background: #dbeafe; color: #2563eb; }
      &--delete { background: #fee2e2; color: #dc2626; }
    }

    .timeline-content {
      flex: 1;
      min-width: 0;
    }

    .timeline-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: $space-2;
    }

    .timeline-action {
      font-size: $font-size-sm;
      color: $color-text-secondary;
    }

    .timeline-entity {
      background: $color-gray-100;
      padding: 1px $space-2;
      border-radius: $radius-sm;
      font-size: $font-size-xs;
      text-transform: capitalize;
    }

    .timeline-time {
      font-size: $font-size-xs;
      color: $color-text-muted;
      white-space: nowrap;
    }

    .timeline-name {
      font-weight: $font-weight-semibold;
      font-size: $font-size-base;
      margin-top: $space-1;
    }

    .timeline-details {
      font-size: $font-size-sm;
      color: $color-text-secondary;
      margin-top: $space-1;
    }

    .summary-bar {
      margin-top: $space-4;
      padding: $space-3 $space-4;
      background: $color-gray-50;
      border-radius: $radius-md;
      font-size: $font-size-sm;
      color: $color-text-secondary;
    }

    .text-muted { color: $color-text-secondary; }
  `,
})
export class ActivityLogComponent implements OnInit {
  private activityService = inject(ActivityLogService);

  loading = signal(true);
  allLogs = signal<IActivityLog[]>([]);
  filtered = signal<IActivityLog[]>([]);

  filterAction = '';
  searchTerm = '';

  async ngOnInit(): Promise<void> {
    const logs = await this.activityService.getAll();
    this.allLogs.set(logs);
    this.filtered.set(logs);
    this.loading.set(false);
  }

  applyFilter(): void {
    let logs = this.allLogs();

    if (this.filterAction) {
      logs = logs.filter((l) => l.action === this.filterAction);
    }

    const term = this.searchTerm.toLowerCase();
    if (term) {
      logs = logs.filter(
        (l) =>
          l.entity_name.toLowerCase().includes(term) ||
          l.entity_type.toLowerCase().includes(term) ||
          l.user_name.toLowerCase().includes(term),
      );
    }

    this.filtered.set(logs);
  }

  getActionLabel(action: string): string {
    const map: Record<string, string> = { create: 'created', update: 'updated', delete: 'deleted' };
    return map[action] || action;
  }
}
