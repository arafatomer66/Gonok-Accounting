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
      padding: 0.4rem 1rem;
      border: 1px solid #ddd;
      border-radius: 20px;
      background: #fff;
      color: #555;
      font-size: 0.85rem;
      cursor: pointer;
      transition: all 0.15s;
      white-space: nowrap;
    }
    .category-pill:hover {
      border-color: #1a73e8;
      color: #1a73e8;
    }
    .category-pill--active {
      background: #1a73e8;
      border-color: #1a73e8;
      color: #fff;
    }
    .category-pill--active:hover {
      color: #fff;
    }
  `,
})
export class CategoryFilterComponent {
  @Input() categories: IStorefrontCategory[] = [];
  @Input() selectedUuid: string | undefined;
  @Output() categoryChange = new EventEmitter<string | undefined>();
}
