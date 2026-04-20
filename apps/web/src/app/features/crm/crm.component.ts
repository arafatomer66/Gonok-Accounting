import { Component, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CrmStore } from '../../core/stores/crm.store';

@Component({
  selector: 'gonok-crm',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="page-header">
      <h1 class="page-header__title">CRM</h1>
    </div>
    <div class="crm-grid">
      <a class="crm-card" routerLink="interactions">
        <div class="crm-card__icon">&#128222;</div>
        <div class="crm-card__content">
          <h3 class="crm-card__title">Interactions</h3>
          <p class="crm-card__desc">Log calls, emails, meetings, and visits with parties</p>
        </div>
        <span class="crm-card__arrow">&rarr;</span>
      </a>
      <a class="crm-card" routerLink="follow-ups">
        <div class="crm-card__icon">&#128197;</div>
        <div class="crm-card__content">
          <h3 class="crm-card__title">Follow-ups</h3>
          <p class="crm-card__desc">Track upcoming and overdue follow-up tasks</p>
        </div>
        <span class="crm-card__arrow">&rarr;</span>
      </a>
      <a class="crm-card" routerLink="pipeline">
        <div class="crm-card__icon">&#128200;</div>
        <div class="crm-card__content">
          <h3 class="crm-card__title">Pipeline</h3>
          <p class="crm-card__desc">Track deals from lead to close with stage management</p>
        </div>
        <span class="crm-card__arrow">&rarr;</span>
      </a>
      <a class="crm-card" routerLink="notes">
        <div class="crm-card__icon">&#128221;</div>
        <div class="crm-card__content">
          <h3 class="crm-card__title">Notes</h3>
          <p class="crm-card__desc">Quick notes and reminders attached to parties</p>
        </div>
        <span class="crm-card__arrow">&rarr;</span>
      </a>
    </div>
  `,
  styles: `
    @use '../../../styles/abstracts/variables' as *;

    .crm-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: $space-4;
    }

    .crm-card {
      display: flex;
      align-items: center;
      gap: $space-4;
      padding: $space-5;
      background: white;
      border: 1px solid $color-border;
      border-radius: $radius-lg;
      text-decoration: none;
      color: inherit;
      transition: box-shadow $transition-base, border-color $transition-base;
      cursor: pointer;

      &:hover {
        border-color: $color-primary;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
      }
    }

    .crm-card__icon {
      font-size: 2rem;
      flex-shrink: 0;
    }

    .crm-card__content {
      flex: 1;
    }

    .crm-card__title {
      font-size: $font-size-lg;
      font-weight: $font-weight-semibold;
      margin: 0 0 $space-1 0;
    }

    .crm-card__desc {
      font-size: $font-size-sm;
      color: $color-text-secondary;
      margin: 0;
    }

    .crm-card__arrow {
      font-size: $font-size-xl;
      color: $color-text-secondary;
      flex-shrink: 0;
    }
  `,
})
export class CrmComponent implements OnInit {
  private crmStore = inject(CrmStore);

  ngOnInit(): void {
    if (!this.crmStore.initialized()) {
      this.crmStore.loadAll();
    }
  }
}
