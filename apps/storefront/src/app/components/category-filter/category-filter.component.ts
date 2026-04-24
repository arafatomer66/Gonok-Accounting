import { Component, Input, Output, EventEmitter } from '@angular/core';
import type { IStorefrontCategory } from '@org/shared-types';

@Component({
  selector: 'sf-category-filter',
  standalone: true,
  template: `
    <div class="category-filter">
      <button
        class="category-pill"
        [class.category-pill--active]="!selectedUuid"
        (click)="categoryChange.emit(undefined)"
      >
        All
      </button>
      @for (cat of categories; track cat.uuid) {
        <button
          class="category-pill"
          [class.category-pill--active]="selectedUuid === cat.uuid"
          (click)="categoryChange.emit(cat.uuid)"
        >
          {{ cat.name }}
        </button>
      }
    </div>
  `,
  styles: `
    .category-filter {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }
    .category-pill {
      padding: 0.5rem 1.15rem;
      border: 1.5px solid #e8eaf0;
      border-radius: 24px;
      background: #fff;
      color: #5a5d72;
      font-size: 0.82rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.25s cubic-bezier(.4,0,.2,1);
      white-space: nowrap;
      font-family: inherit;
      letter-spacing: 0.01em;
    }
    .category-pill:hover {
      border-color: #4361ee;
      color: #4361ee;
      background: rgba(67,97,238,0.04);
    }
    .category-pill--active {
      background: linear-gradient(135deg, #4361ee, #7c3aed);
      border-color: transparent;
      color: #fff;
      box-shadow: 0 2px 10px rgba(67,97,238,0.25);
    }
    .category-pill--active:hover {
      color: #fff;
      background: linear-gradient(135deg, #3a56d4, #6b32c9);
    }
  `,
})
export class CategoryFilterComponent {
  @Input() categories: IStorefrontCategory[] = [];
  @Input() selectedUuid: string | undefined;
  @Output() categoryChange = new EventEmitter<string | undefined>();
}
